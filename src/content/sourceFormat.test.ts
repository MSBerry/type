import { describe, expect, it } from 'vitest';
import { parseSource } from './sourceFormat';

const HEADER = `# 注释
id: demo
title: 示例书
author: 某某 · 明
grade: 5
term: 下册
theme: 古典名著
skinId: monkey
skinName: 美猴王
cover: #FF7A45
mark: 示
kind: prose
`;

describe('parseSource', () => {
  it('读出书的信息、段落和小考考', () => {
    const { meta, segments } = parseSource(`${HEADER}
=== c1 | 第一段
海外有一国土，
名曰傲来国。
? 叫什么国？ | 女儿国 | *傲来国

=== c2 | 第二段
便[biàn]就学爬。
`);
    expect(meta).toMatchObject({ id: 'demo', title: '示例书', grade: 5, term: '下册', cover: '#FF7A45', kind: 'prose' });
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      id: 'c1',
      title: '第一段',
      body: '海外有一国土，名曰傲来国。',
      quiz: { q: '叫什么国？', options: ['女儿国', '傲来国'], answer: 1 },
    });
    expect(segments[1].body).toBe('便[biàn]就学爬。');
    expect(segments[1].quiz).toBeUndefined();
  });

  it('兼容 Windows 换行和 BOM', () => {
    const { segments } = parseSource(`\uFEFF${HEADER}\r\n=== c1 | 一\r\n海外。\r\n`);
    expect(segments[0].body).toBe('海外。');
  });

  it('缺字段时报错并说出字段名', () => {
    expect(() => parseSource(HEADER.replace('mark: 示\n', '') + '=== c1 | 一\n海。')).toThrow('缺少书的信息「mark」');
  });

  it('段落标题写错时报出行号', () => {
    expect(() => parseSource(`${HEADER}=== 没有竖线\n海。`)).toThrow(/第 \d+ 行：段落标题/);
  });

  it('小考考没有标正确答案时报错', () => {
    expect(() => parseSource(`${HEADER}=== c1 | 一\n海。\n? 问题 | 甲 | 乙`)).toThrow(/小考考/);
  });

  it('年级不合法时报错', () => {
    expect(() => parseSource(HEADER.replace('grade: 5', 'grade: 3') + '=== c1 | 一\n海。')).toThrow('grade');
  });
});
