import type { BookMeta } from './schema';

/** 书架上的全部书。有没有内容由 src/content/books/<id>.json 是否存在决定。顺序就是显示顺序。 */
export const SHELF: BookMeta[] = [
  { id: 'zhongguoshenhua', title: '中国古代神话', author: '盘古 · 女娲 · 后羿', grade: 4, term: '上册', theme: '神话故事', skinId: 'archer', skinName: '后羿小射手', cover: '#FFC93C', mark: '神', kind: 'prose' },
  { id: 'xilashenhua', title: '希腊神话故事', author: '施瓦布 整理', grade: 4, term: '上册', theme: '神话故事', skinId: 'pegasus', skinName: '小天马', cover: '#6FB1FF', mark: '希', kind: 'prose' },
  { id: 'shijieshenhua', title: '世界神话传说', author: '各国神话', grade: 4, term: '上册', theme: '神话故事', skinId: 'rainbow', skinName: '彩虹使者', cover: '#B9A4FF', mark: '世', kind: 'prose' },
  { id: 'shiwange', title: '十万个为什么', author: '伊林 · 苏联', grade: 4, term: '下册', theme: '科普读物', skinId: 'doctor', skinName: '小博士', cover: '#34C38F', mark: '问', kind: 'prose' },
  { id: 'diqiu', title: '看看我们的地球', author: '李四光', grade: 4, term: '下册', theme: '科普读物', skinId: 'geologist', skinName: '地质探险家', cover: '#FF9FB2', mark: '地', kind: 'prose' },
  { id: 'xijun', title: '细菌世界历险记', author: '高士其', grade: 4, term: '下册', theme: '科普读物', skinId: 'detective', skinName: '显微镜侦探', cover: '#FF7A45', mark: '菌', kind: 'prose' },
  { id: 'zhongguominjian', title: '中国民间故事', author: '牛郎织女 · 神笔马良', grade: 5, term: '上册', theme: '民间故事', skinId: 'painter', skinName: '神笔小画家', cover: '#FF7A45', mark: '民', kind: 'prose' },
  { id: 'ouzhouminjian', title: '欧洲民间故事', author: '格林兄弟 等', grade: 5, term: '上册', theme: '民间故事', skinId: 'knight-castle', skinName: '城堡小骑士', cover: '#6FB1FF', mark: '欧', kind: 'prose' },
  { id: 'feizhouminjian', title: '非洲民间故事', author: '口口相传的智慧', grade: 5, term: '上册', theme: '民间故事', skinId: 'savanna', skinName: '草原小勇士', cover: '#FFC93C', mark: '非', kind: 'prose' },
  { id: 'yiqianlingyiye', title: '一千零一夜', author: '阿拉伯民间故事', grade: 5, term: '上册', theme: '民间故事', skinId: 'carpet', skinName: '飞毯旅行家', cover: '#B9A4FF', mark: '夜', kind: 'prose' },
  { id: 'xiyouji', title: '西游记', author: '吴承恩 · 明', grade: 5, term: '下册', theme: '古典名著', skinId: 'monkey', skinName: '美猴王', cover: '#FF7A45', mark: '西', kind: 'prose' },
  { id: 'sanguo', title: '三国演义', author: '罗贯中 · 明', grade: 5, term: '下册', theme: '古典名著', skinId: 'strategist', skinName: '卧龙军师', cover: '#6FB1FF', mark: '三', kind: 'prose' },
  { id: 'shuihu', title: '水浒传', author: '施耐庵 · 明', grade: 5, term: '下册', theme: '古典名著', skinId: 'hero', skinName: '梁山好汉', cover: '#34C38F', mark: '水', kind: 'prose' },
  { id: 'hongloumeng', title: '红楼梦', author: '曹雪芹 · 清', grade: 5, term: '下册', theme: '古典名著', skinId: 'poet-garden', skinName: '大观园诗人', cover: '#FF9FB2', mark: '红', kind: 'prose' },
  { id: 'tongnian', title: '童年', author: '高尔基 · 苏联', grade: 6, term: '上册', theme: '成长故事', skinId: 'sailor', skinName: '伏尔加小水手', cover: '#6FB1FF', mark: '童', kind: 'prose' },
  { id: 'yulai', title: '小英雄雨来', author: '管桦', grade: 6, term: '上册', theme: '成长故事', skinId: 'reed-hero', skinName: '芦苇荡小英雄', cover: '#34C38F', mark: '雨', kind: 'prose' },
  { id: 'aideyujiao', title: '爱的教育', author: '亚米契斯 · 意大利', grade: 6, term: '上册', theme: '成长故事', skinId: 'monitor', skinName: '小小班长', cover: '#FF9FB2', mark: '爱', kind: 'prose' },
  { id: 'lubinxun', title: '鲁滨逊漂流记', author: '笛福 · 英国', grade: 6, term: '下册', theme: '世界名著', skinId: 'island', skinName: '荒岛求生家', cover: '#FFC93C', mark: '岛', kind: 'prose' },
  { id: 'tangmu', title: '汤姆·索亚历险记', author: '马克·吐温 · 美国', grade: 6, term: '下册', theme: '世界名著', skinId: 'river', skinName: '大河冒险王', cover: '#FF7A45', mark: '汤', kind: 'prose' },
  { id: 'qie', title: '骑鹅旅行记', author: '拉格洛芙 · 瑞典', grade: 6, term: '下册', theme: '世界名著', skinId: 'goose', skinName: '骑鹅小旅人', cover: '#B9A4FF', mark: '鹅', kind: 'prose' },
  { id: 'ailisi', title: '爱丽丝漫游奇境', author: '卡罗尔 · 英国', grade: 6, term: '下册', theme: '世界名著', skinId: 'wonder', skinName: '奇境魔术师', cover: '#34C38F', mark: '奇', kind: 'prose' },
  { id: 'gushici', title: '古诗词小站', author: '小学必背古诗', grade: 0, term: '通用', theme: '古诗词小站', skinId: 'poet', skinName: '小诗仙', cover: '#FFF3C4', mark: '诗', kind: 'poem' },
];
