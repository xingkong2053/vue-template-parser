import { TextMode, ParseContext, Node } from "./types"
import { parseChildren } from "./parse"

// 解析函数
export function parse(str: string): Node{
  const context: ParseContext = {
    source: str,
    // 初始模式
    mode: TextMode.DATA,
    advanceBy(num) {
      // "消费" context.source
      context.source = context.source.slice(num)
    },
    // 消费空白字符
    advanceSpaces() {
      const match = /^[\t\r\n\f]+/.exec(context.source)
      if(match){
        context.advanceBy(match[0].length)
      }
    },
  }
  const nodes = parseChildren(context, [])

  // 解析器返回ROOT根节点
  return {
    type: "ROOT",
    children: nodes
  }
} 

