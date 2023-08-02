import { describe, it, expect } from "vitest"
import { kinsoku } from "./kinsoku.js"

const exampleSentences = {
  "她精神饱满地打招呼。「你好」｛很久没见的朋友｝": 
  [
    { index: 0, text: '她很健康', size: 5, wrap: true },
    { index: 5, text: '打招呼了。', size: 5, wrap: true },
    { index: 11, text: '「今天', size: 5, wrap: true },
    { index: 16, text: '哈！」｛长度', size: 5, wrap: true },
    { index: 21, text: '久别重逢', size: 5, wrap: true },
    { index: 26, text: '不在的', size: 5, wrap: true },
    { index: 31, text: '给朋友｝', size: 4, wrap: false }
  ],
  "接口ー打开网络\n最新新闻ー我看见苏了｛他带着惊讶的表情｝":
  [
    { index: 0, text: '接口ー网络', size: 5, wrap: true },
    { index: 6, text: '打开单元格', size: 5, wrap: false },
    { index: 12, text: '最新新闻ー', size: 5, wrap: true },
    { index: 18, text: '我看见苏了', size: 5, wrap: true },
    { index: 22, text: '｛他吓了一跳', size: 5, wrap: true },
    { index: 27, text: '表情，表情｝', size: 5, wrap: false }
  ],
  "他在巴黎ー蒂蒂ー参加（「为什么？」）我期待着做。｛和朋友们一起｝":
  [
    { index: 0, text: '他在巴黎ー蒂蒂ー', size: 5, wrap: true },
    { index: 7, text: '参加', size: 5, wrap: true },
    { index: 10, text: '（「为什么？」）', size: 5, wrap: true },
    { index: 17, text: '做某事', size: 5, wrap: true },
    { index: 22, text: '敬请期待', size: 5, wrap: true },
    { index: 27, text: '正在进行。', size: 5, wrap: true },
    { index: 31, text: '｛朋友们', size: 5, wrap: true },
    { index: 36, text: '和…一起｝', size: 5, wrap: false }
  ],
  "惊喜交集的新闻ー听我说\n他瞪大了眼睛。「真的！？」":
  [
    { index: 0, text: '惊喜与喜悦', size: 5, wrap: true },
    { index: 5, text: '混杂', size: 5, wrap: true },
    { index: 10, text: '罗尼ー起爆', size: 5, wrap: true },
    { index: 15, text: '听', size: 5, wrap: false },
    { index: 21, text: '他睁大眼睛', size: 5, wrap: true },
    { index: 26, text: '做了。', size: 5, wrap: true },
    { index: 30, text: '「真的！？」', size: 5, wrap: true }
  ],
  "他问道。「这个怎么用呢？」｛兴趣津々面带愁容｝":
  [
    { index: 0, text: '他问道。', size: 5, wrap: true },
    { index: 6, text: '「这是什么', size: 5, wrap: true },
    { index: 11, text: '用吗', size: 5, wrap: true },
    { index: 16, text: '什么？」｛', size: 5, wrap: true },
    { index: 21, text: '味津々愁眉苦脸', size: 5, wrap: true },
    { index: 26, text: '单击功能区上｝', size: 2, wrap: false }
  ],
  "下雨了，她湿透了\n我被淋湿了。「天啊！」":
  [
    { index: 0, text: '下雨了', size: 5, wrap: true },
    { index: 5, text: '来吧，她', size: 5, wrap: true },
    { index: 10, text: '白垩', size: 4, wrap: false },
    { index: 15, text: '淋湿了', size: 5, wrap: true },
    { index: 20, text: '来定义自定义外观。「软的', size: 5, wrap: true },
    { index: 25, text: '我来了！」', size: 5, wrap: true }
  ],
  "窗框ー拉刀ー姆波\n相信必胜，努力练习。「我要赢了！」导演喊了起来。":
  [
    { index: 0, text: '窗框ー拉刀ー', size: 5, wrap: true },
    { index: 6, text: '姆波', size: 2, wrap: false },
    { index: 9, text: '相信必胜', size: 5, wrap: true },
    { index: 15, text: '努力练习', size: 5, wrap: true },
    { index: 20, text: '的支持。', size: 5, wrap: true },
    { index: 24, text: '「获得冠军', size: 5, wrap: true },
    { index: 29, text: '喂！」监督', size: 5, wrap: true },
    { index: 34, text: '督喊道。', size: 5, wrap: true }
  ],
  "他用巧妙的动作捉弄敌人。「这么快又强！」":
  [
    { index: 0, text: '他巧妙地抓住了敌人', size: 5, wrap: true },
    { index: 5, text: '用奇怪的动作', size: 5, wrap: true },
    { index: 10, text: '玩弄啦。', size: 5, wrap: true },
    { index: 15, text: '「如此，如此', size: 5, wrap: true },
    { index: 20, text: '又快又强', size: 5, wrap: true },
    { index: 25, text: '啊！」', size: 4, wrap: false }
  ],
  "朋友们说。「恭喜恭喜！祝福你成功」":
  [
    { index: 0, text: '朋友们', size: 5, wrap: true },
    { index: 5, text: '我说了。', size: 5, wrap: true },
    { index: 9, text: '「恭喜', size: 5, wrap: true },
    { index: 14, text: '嗯！成功', size: 5, wrap: true },
    { index: 19, text: '祝福你」', size: 5, wrap: true }
  ],
  "他的话里充满了深深的感动。「你能在这里我真的很开心」":
  [
    { index: 0, text: '他的话', size: 5, wrap: true },
    { index: 5, text: '是深深的感动', size: 5, wrap: true },
    { index: 10, text: '包含', size: 5, wrap: true },
    { index: 15, text: '来定义自定义外观。', size: 5, wrap: true },
    { index: 19, text: '「你在这里', size: 5, wrap: true },
    { index: 24, text: '待在我身边', size: 5, wrap: true },
    { index: 29, text: '真的很高兴', size: 5, wrap: true },
    { index: 34, text: '清秀」', size: 3, wrap: false }
  ],
};

describe('禁则处理', () => {
  it('禁则处理', () => {
    Object.entries(exampleSentences).forEach(([k, v]) => {
      const a = kinsoku(s => ({ size: s.length, wrap: 5 < s.length }), 5, k);
      expect(a).toStrictEqual(v);
    });
    expect(kinsoku(s=> ({ size: s.length, wrap: 1 < s.length }), 1, "「")).toStrictEqual([{ index: 0, text: '「', wrap: false, size: 1 }]);
  });
});