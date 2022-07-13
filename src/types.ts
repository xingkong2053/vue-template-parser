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
  children?: Node[]
}

export interface ParseContext{
  // 模板内容
  source: string,
  // 解析器模式
  mode: TextMode
}