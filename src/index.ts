import { TextMode, ParseContext, Node } from "./types"
import { parseChildren } from "./parse"

// 解析函数
export function parse(str: string): Node{
  const context: ParseContext = {
    source: str,
    // 初始模式
    mode: TextMode.DATA
  }
  const nodes = parseChildren(context, [])

  // 解析器返回ROOT根节点
  return {
    type: "ROOT",
    children: nodes
  }
}

