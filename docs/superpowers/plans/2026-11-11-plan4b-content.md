# 计划 4b：六本书的内容、小考考换位置、开始标点不落单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第一版上线的 6 本书都有完整内容（设计第 7.2 节）：中国古代神话 20 段、中国民间故事 20 段、西游记 24 段、三国演义 24 段、水浒传 24 段、古诗词小站 30 首。小考考的正确答案在屏幕上随机换位置；前引号、书名号跟后一个字排在一起。

**Architecture:** 代码部分只有三处：结算页按「书 id + 段 id」算一个固定的选项顺序（同一段每次看都一样，不同段不一样）；`Passage` 的 `toUnits` 让开始标点和后一个字一组；测试改成从真实书目里取段落列表，不再写死「西游记只有 4 段」。内容部分每本书一个 `content-src/<id>.txt`，按原有流程 `annotate` → 核对多音字 → `validate`。

**Tech Stack:** 沿用前面的计划。

**内容原则（设计第 7.1 节）:**
- 西游记、三国演义、水浒传用原著原文选段。可以在句子之间删节，但不改写原句、不编造原文；拿不准的句子宁可不用。
- 中国古代神话、中国民间故事用我们自己的话改写，不照抄课本或任何出版物的文字。
- 古诗词只用公版古诗，诗句必须准确。
- 内容适合 9–12 岁孩子：不写血腥细节，打斗点到为止。

---

### Task 1: 小考考换位置、开始标点不落单、测试不依赖真实段数

**Files:**
- Create: `src/content/quizOrder.ts`
- Modify: `src/pages/Result.tsx`, `src/ui/Passage.tsx`
- Test: `src/content/quizOrder.test.ts`, `src/ui/Passage.test.tsx`, `src/pages/Result.test.tsx`，以及写死西游记段落的测试：`src/App.test.tsx`、`src/content/library.test.ts`、`src/pages/Bookshelf.test.tsx`、`src/pages/Home.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/content/quizOrder.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { quizOrder } from './quizOrder';

describe('quizOrder', () => {
  it('是 0..n-1 的一个排列', () => {
    expect([...quizOrder(4, 'xiyouji/c1-1')].sort()).toEqual([0, 1, 2, 3]);
  });

  it('同一段每次都一样', () => {
    expect(quizOrder(3, 'sanguo/c1-2')).toEqual(quizOrder(3, 'sanguo/c1-2'));
  });

  it('原来第一个选项会出现在不同位置', () => {
    const where = new Set(Array.from({ length: 30 }, (_, i) => quizOrder(3, `book/s${i}`).indexOf(0)));
    expect(where.size).toBe(3);
  });
});
```

`src/ui/Passage.test.tsx` 里加（用这个文件已有的建 session、渲染的写法）：

```tsx
  it('前引号和书名号跟后一个字在同一组', () => {
    const tokens: Token[] = [
      { kind: 'hanzi', char: '说', key: 'shuo', tone: 'shuō' },
      { kind: 'skip', char: '：' },
      { kind: 'skip', char: '“' },
      { kind: 'hanzi', char: '读', key: 'du', tone: 'dú' },
      { kind: 'skip', char: '《' },
      { kind: 'hanzi', char: '西', key: 'xi', tone: 'xī' },
      { kind: 'skip', char: '》' },
      { kind: 'skip', char: '”' },
    ];
    render(<Passage session={createSession(tokens)} showPinyin />);
    const unitOf = (ch: string) => screen.getByText(ch).closest('.pg-unit');
    expect(unitOf('“')).toBe(unitOf('读'));
    expect(unitOf('《')).toBe(unitOf('西'));
    expect(unitOf('：')).toBe(unitOf('说'));
    expect(unitOf('”')).toBe(unitOf('西'));
  });
```

（`screen.getByText('西')` 如果因为拼音也在同一元素里而找不到，改用这个文件里已有的查找方式，比如按 `.pg-char` 的文本找。断言的意思不变。）

`src/pages/Result.test.tsx` 里加：

```tsx
  it('选项顺序打乱后，判对错仍然按原来的正确答案', () => {
    // 用一段带小考考的真实段落；无论选项怎么排，点正确答案的文字就算对
    const seg = getSegment('xiyouji', 'c1-1')!;
    renderResultFor(seg); // 用这个文件已有的渲染写法，让结算页显示 xiyouji/c1-1 的成绩
    fireEvent.click(screen.getByRole('button', { name: seg.quiz!.options[seg.quiz!.answer] }));
    expect(screen.getByText('答对啦！星星 +1')).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/content/quizOrder.test.ts src/ui/Passage.test.tsx src/pages/Result.test.tsx`
Expected: quizOrder 和 Passage 的新测试 FAIL（Result 的可能本来就通过，没关系）

- [ ] **Step 3: 写 `src/content/quizOrder.ts`**

```ts
/** 把字符串变成一个 32 位整数（FNV-1a） */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 小考考选项在屏幕上的顺序：由 key（书 id/段 id）决定，同一段每次都一样 */
export function quizOrder(n: number, key: string): number[] {
  let seed = hash(key) || 1;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
```

- [ ] **Step 4: 结算页按这个顺序显示**

`src/pages/Result.tsx`：加 import `import { quizOrder } from '../content/quizOrder';`，把 `{quiz.options.map((opt, i) => {` 那一段换成：

```tsx
              {quizOrder(quiz.options.length, `${r.bookId}/${r.segmentId}`).map((i) => {
                const opt = quiz.options[i];
                const isRight = picked !== null && i === quiz.answer;
                const isWrong = picked === i && i !== quiz.answer;
                const cls = isRight ? 'btn quiz-option is-right' : isWrong ? 'btn quiz-option is-wrong' : 'btn quiz-option';
                return (
                  <button key={opt} type="button" className={cls} aria-pressed={picked === i} onClick={() => pick(i)}>
                    {isRight && <span aria-hidden="true">✓</span>}
                    {isWrong && <span aria-hidden="true">✗</span>}
                    {opt}
                  </button>
                );
              })}
```

（`i` 仍然是原来的选项下标，`quizPick`、`answer` 的含义都不变。）

- [ ] **Step 5: 开始标点跟后一个字一组**

`src/ui/Passage.tsx` 的 `toUnits` 换成：

```ts
/** 这些标点要和后面的字排在一起，不能留在行尾 */
const OPENERS = '“‘「『《〈（(【〔';

function toUnits(tokens: Token[]): Item[][] {
  const units: Item[][] = [];
  let open: Item[] = [];
  tokens.forEach((token, index) => {
    const item = { token, index };
    if (token.kind === 'skip' && OPENERS.includes(token.char)) {
      open.push(item);
      return;
    }
    if (token.kind === 'skip' && open.length === 0 && units.length > 0) {
      units[units.length - 1].push(item);
      return;
    }
    units.push([...open, item]);
    open = [];
  });
  if (open.length > 0) units.push(open);
  return units;
}
```

- [ ] **Step 6: 测试不再写死西游记的段数**

西游记会从 4 段增加到 24 段，下面这些地方要改成从真实书目里取：

- 凡是表示「整本书都读完了」的 `done: ['c1-1', 'c1-2', 'c1-3', 'c1-4']`（`src/App.test.tsx`、`src/pages/Bookshelf.test.tsx`、`src/pages/Home.test.tsx`），改成 `done: getBook('xiyouji')!.segments.map((s) => s.id)`，`lastSegment` 改成这个列表的最后一个。需要的话从 `../content/library`（或 `./content/library`）导入 `getBook`。
- `src/content/library.test.ts`：
  - `expect(xiyouji?.segmentIds).toEqual(['c1-1', 'c1-2', 'c1-3', 'c1-4'])` 改成检查前 4 个是 `['c1-1', 'c1-2', 'c1-3', 'c1-4']`（`.slice(0, 4)`），并且和 `getBook('xiyouji')!.segments.map(s => s.id)` 一致。
  - `segmentAfter(book, 'c1-4')` 期望 `null` 的那句，改成对书的最后一段期望 `null`：`segmentAfter(book, book.segments[book.segments.length - 1].id)`。
- 其他只用 `c1-1`、`c1-2` 的测试不用改（这两段内容保持不变）。

- [ ] **Step 7: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 8: 提交**

```bash
git add src/content/quizOrder.ts src/content/quizOrder.test.ts src/pages/Result.tsx src/pages/Result.test.tsx src/ui/Passage.tsx src/ui/Passage.test.tsx src/App.test.tsx src/content/library.test.ts src/pages/Bookshelf.test.tsx src/pages/Home.test.tsx
git commit -m "feat: 小考考选项换位置，开始标点不落单，测试不依赖真实段数"
```

---

## 写书的通用要求（Task 2–7 都适用）

**源文件格式**（参照 `content-src/xiyouji.txt`，解析器是 `src/content/sourceFormat.ts`）：

```
# 注释行
id: <书 id>
title: <书名>
author: <作者>
grade: <年级>
term: <上册/下册/通用>
theme: <主题>
skinId: <皮肤 id>
skinName: <皮肤名>
cover: <颜色>
mark: <封面字>
kind: <prose 或 poem>

=== <段落 id> | <段落标题>
正文（可以分几行写，会连在一起）。多音字写成 字[拼音]，比如 还[huán]、长[zhǎng]。
? 问题 | 错误答案 | *正确答案 | 错误答案
```

- 书的信息（id、title、author、grade、term、theme、skinId、skinName、cover、mark、kind）必须和 `src/content/shelf.ts` 里这本书的那一行完全一致。
- 段落 id 只用字母、数字、`-`，书内不重复。
- **每段汉字数**：普通书 40–80 个汉字（标点不算），古诗 16–120 个汉字。写完一段数一下。
- **小考考**：普通书每段都要有，3 个选项，答案能从这一段里找到，问题用孩子听得懂的话。正确答案前面加 `*`，放在哪个位置都行（屏幕上会再打乱）。选项不能重复。古诗可以不出题。
- 不用生僻字和异体字；不用英文、数字、emoji。标点用中文全角标点。
- 方括号 `[]` 只用来标多音字的读音，正文里不要出现别的方括号。

**生成和核对：**

1. Run: `npx tsx scripts/annotate.ts content-src/<书 id>.txt`
2. 看输出里的每一条 `[多音字]`：按这一句的意思判断读音对不对，不对就在源文件里给这个字加 `[正确拼音]`（带声调，比如 `[zhòng]`），然后重新运行第 1 步。直到所有 `[多音字]` 的读音都确认是对的（读音本来就对的不用加）。
3. 输出里如果有 `[标不出]`，换一个常用字的说法。
4. Run: `npm run validate`，这本书显示 `OK  《书名》 N 段`，N 等于要求的段数。

**只改这本书的两个文件**：`content-src/<书 id>.txt` 和生成的 `src/content/books/<书 id>.json`。不要提交（多本书同时在写，最后统一提交）。

---

### Task 2: 西游记（补到 24 段）

**Files:** Modify `content-src/xiyouji.txt` → `src/content/books/xiyouji.json`

- [ ] 保留现有的 `c1-1` 到 `c1-4` 四段一字不改（测试依赖它们）。
- [ ] 在后面补 20 段，合计 24 段。内容取原著第一回到第七回，按故事顺序：石猴发现水帘洞、众猴拜石猴为王、美猴王出海学艺、拜须菩提祖师、学七十二变和筋斗云、回花果山、东海龙宫取金箍棒、地府勾掉生死簿、天庭封弼马温、自封齐天大圣、看管蟠桃园、大闹天宫、二郎神擒大圣、八卦炉炼出火眼金睛、如来佛祖压在五行山下。
- [ ] 段落 id 用 `c<回>-<序号>`，比如 `c3-1`；标题写成「第三回 · 龙宫借宝」。
- [ ] 源文件第一行注释写明：原著选段，个别地方有删节。
- [ ] 跑完生成和核对四步，validate 显示 `OK  《西游记》 24 段`。

### Task 3: 三国演义（24 段）

**Files:** Create `content-src/sanguo.txt` → `src/content/books/sanguo.json`

- [ ] 书的信息照 `shelf.ts`：id sanguo、title 三国演义、author 罗贯中 · 明、grade 5、term 下册、theme 古典名著、skinId strategist、skinName 卧龙军师、cover #6FB1FF、mark 三、kind prose。
- [ ] 24 段原著选段，按故事顺序，建议：桃园三结义、三英战吕布、煮酒论英雄、关羽千里走单骑、三顾茅庐、隆中对、草船借箭、借东风、火烧赤壁、华容道、空城计等。每个故事 1–3 段。
- [ ] 段落 id 用 `c<回>-<序号>`，标题写成「第一回 · 桃园结义」。
- [ ] 跑完生成和核对四步，validate 显示 `OK  《三国演义》 24 段`。

### Task 4: 水浒传（24 段）

**Files:** Create `content-src/shuihu.txt` → `src/content/books/shuihu.json`

- [ ] 书的信息照 `shelf.ts`：id shuihu、title 水浒传、author 施耐庵 · 明、grade 5、term 下册、theme 古典名著、skinId hero、skinName 梁山好汉、cover #34C38F、mark 水、kind prose。
- [ ] 24 段原著选段，按故事顺序，选适合孩子的故事，建议：鲁智深倒拔垂杨柳、林冲棒打洪教头、智取生辰纲、武松景阳冈打虎（可以多几段）、花荣射雁、宋江和众好汉上梁山等。打斗场面点到为止，不写血腥细节。
- [ ] 段落 id 用 `c<回>-<序号>`，标题写成「第二十三回 · 景阳冈」。
- [ ] 跑完生成和核对四步，validate 显示 `OK  《水浒传》 24 段`。

### Task 5: 中国古代神话（20 段，自己改写）

**Files:** Create `content-src/zhongguoshenhua.txt` → `src/content/books/zhongguoshenhua.json`

- [ ] 书的信息照 `shelf.ts`：id zhongguoshenhua、title 中国古代神话、author 盘古 · 女娲 · 后羿、grade 4、term 上册、theme 神话故事、skinId archer、skinName 后羿小射手、cover #FFC93C、mark 神、kind prose。
- [ ] 20 段，用我们自己的话讲（不照抄课本），建议故事：盘古开天地、女娲造人、女娲补天、后羿射日、嫦娥奔月、精卫填海、夸父逐日、大禹治水、神农尝百草、仓颉造字、燧人氏钻木取火、共工怒触不周山。每个故事 1–3 段，一段讲一个完整的小情节。
- [ ] 段落 id 用故事拼音缩写加序号，比如 `pangu-1`；标题写成「盘古开天地 · 一」。
- [ ] 第一行注释写明：自写改编。
- [ ] 跑完生成和核对四步，validate 显示 `OK  《中国古代神话》 20 段`。

### Task 6: 中国民间故事（20 段，自己改写）

**Files:** Create `content-src/zhongguominjian.txt` → `src/content/books/zhongguominjian.json`

- [ ] 书的信息照 `shelf.ts`：id zhongguominjian、title 中国民间故事、author 牛郎织女 · 神笔马良、grade 5、term 上册、theme 民间故事、skinId painter、skinName 神笔小画家、cover #FF7A45、mark 民、kind prose。
- [ ] 20 段，用我们自己的话讲（不照抄课本），建议故事：牛郎织女、神笔马良、田螺姑娘、八仙过海、鲁班造锯、年的传说、老鼠嫁女、曹冲称象、司马光砸缸、孔融让梨。每个故事 1–3 段。
- [ ] 段落 id 和标题的写法同 Task 5，比如 `maliang-1`、「神笔马良 · 一」。
- [ ] 第一行注释写明：自写改编。
- [ ] 跑完生成和核对四步，validate 显示 `OK  《中国民间故事》 20 段`。

### Task 7: 古诗词小站（30 首）

**Files:** Create `content-src/gushici.txt` → `src/content/books/gushici.json`

- [ ] 书的信息照 `shelf.ts`：id gushici、title 古诗词小站、author 小学必背古诗、grade 0、term 通用、theme 古诗词小站、skinId poet、skinName 小诗仙、cover #FFF3C4、mark 诗、kind poem。
- [ ] 30 首小学阶段常背的公版古诗（唐宋为主），每首一段。段落 id 用 `p01` 到 `p30`；标题写成「静夜思 · 李白」。正文只写诗句（不写标题和作者），每句后面用中文标点。
- [ ] 诗句必须准确：只选自己确定原文的诗，用通行的课本版本（比如《静夜思》用「床前明月光，疑是地上霜。举头望明月，低头思故乡。」）。
- [ ] 古诗里的多音字特别多（比如「斜」「还」「看」「教」「骑」），每一条 `[多音字]` 都要按诗意确认。押韵用的古音（比如「斜」读 xiá）按现在课本的注音，不按古音。
- [ ] 小考考可以不出；要出就 3 个选项。
- [ ] 跑完生成和核对四步，validate 显示 `OK  《古诗词小站》 30 段`。

---

### Task 8: 汇总、提交和验收

- [ ] `npm run validate`：6 本书全部 OK，段数分别是 20、20、24、24、24、30。
- [ ] `npm test`、`npm run build` 通过。如果有测试因为书目增加而失败（比如书架上「已上线」的数量），按新内容改测试。
- [ ] 每本书单独提交一次：

```bash
git add content-src/<id>.txt src/content/books/<id>.json
git commit -m "content: 《书名》N 段"
```

- [ ] 浏览器里：读书岛 4、5 年级和古诗词小站都能看到已上线的书；每本书打开第一段能打字；对话段落里的前引号不会落在行尾；结算页小考考的正确答案不总在同一个位置。

---

## 完成标准

- 6 本书内容完整，`npm run validate`、`npm test`、`npm run build` 通过。
- 读完任意一本书都能领到对应的大皮肤。
