import { Node, ParseContext, TextMode } from "./types"

/**
 * 转换子节点
 * 本质上是状态机, 该状态机有多少种状态取决于节点数量
 * @param context 上下文对象
 * @param ancestors 父节点构成的节点栈
 * @returns 子节点
 */
export function parseChildren(context: ParseContext, ancestors: Node[]): Node[]{
  // 最终返回值
  let nodes: Node[] = [];
  const { source/* 待解析的字符串 */, mode } = context
  while(!isEnd(context, ancestors)){
    let node: Node | null = null;
    // DATA和RCDATA模式支持插值节点解析
    if(mode === TextMode.DATA || mode === TextMode.RCDATA){
      if(mode === TextMode.DATA && source[0] === "<"){
        if(source[1] === "!"){  // <!-- or <![CDATA[
          if(source.startsWith("<!--")){
            node = parseComment(context)
          } else if(source.startsWith("<![CDATA[")){
            node = parseCDATA(context)
          }
        } else if(source[1] === "/"){ // should throw error
          
        } else if(/[a-z]i/.test(source[1])){  // tag
          node = parseElement(context, ancestors)
        }
      } else if(source.startsWith("{{")) { // 解析插值表达式
        node = parseInterpolation(context)
      }
    }
    // node不存在, 说明处于其他模式, 
    // 在这种情况下, 将内容处理为文本节点
    if(!node){
      node = parseText(context)
    }
    nodes.push(node)
  }
  return nodes
}

function isEnd(context: ParseContext, ancestors: Node[]): boolean{
  if(!context.source) return true;
  // 获取栈顶元素
  const parent = ancestors[ancestors.length - 1];
  // 遇到结束标签并且该标签与父节点标签同名就停止  
  if(parent && context.source.startsWith(`</${parent.tag}>`)){
    return true
  }
  
  return false
}

export function parseElement(context: ParseContext, ancestors: Node[]): Node{
  const element = parseTag() // 解析并消费开始标签
  ancestors.push(element)
  // 调用方式 parseChildren -> parseElement -> parseChildren
  // 每一次调用parseChildren都会开启一个状态机
  // 递归下降算法
  // 最终会构造出一颗树形结构的AST
  element.children = parseChildren(context, ancestors)
  ancestors.pop()
  parseEndTag()   //解析并消费结束标签
  return element
}

export function parseComment(context: ParseContext): Node{
  
  return {
    type: "Comment"
  }
}

export function parseCDATA(context: ParseContext): Node{

  return {
    type: "CDATA"
  }
}

// 插值节点
export function parseInterpolation(context: ParseContext): Node{

  return {
    type: "Interpolation"
  }
}

export function parseText(context: ParseContext): Node{

  return {
    type: "Text"
  }
}

// 解析开始标签
function parseTag(): Node{
  return {
    type: "Element",
    tag: "div",
    children: []
  }
}

// 解析结束标签
function parseEndTag(){

}