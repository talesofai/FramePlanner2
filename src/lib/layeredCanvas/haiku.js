const haiku = [
  "古池屋\n青蛙跳进去\n水声",
  "夏草铺\n士兵们\n梦的痕迹",
  "吃柿子的话\n钟一响\n法隆寺",
  "深秋\n旁边是什么\n做的人",
  "牵牛花\n吊桶\n污水",
  "五月雨\n收集\n最上川",
  "小麻将\n到处都是\n马走过去",
  "油菜花\n月光在东方\n太阳在西边",
  "眼睛里是绿叶\n断断续续\n初次见面",
  "瘦蛙\n不需要运输\n在这里",
  "清闲\n浸入岩石\n蝉声",
];

export function getHaiku() {
  return haiku[Math.floor(Math.random() * haiku.length)];
}
