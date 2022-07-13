export enum TextMode {
  DATA = "DATA",
  RCDATA = "RCDATA",
  RAWTEXT = "RAWTEXT",
  CDATA = "CDATA",
}

// 节点类型
export interface Node{
  type: string,
  tag?: string,
  content?: string,
  children?: Node[],
  props?: any[],
  isSelfClosing?: boolean
}

export interface ParseContext{
  // 模板内容
  source: string,
  // 解析器模式
  mode: TextMode,
  //消费指定数目字符
  advanceBy(num: number): void;
  // 消费空白字符
  advanceSpaces(): void;
}

export interface Attribute{
  type: string,
  name: string,
  value: string
}