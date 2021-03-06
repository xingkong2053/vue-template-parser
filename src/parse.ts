import { Attribute, Node, ParseContext, TextMode } from "./types"

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
  while(!isEnd(context, ancestors)){
    const { source/* 待解析的字符串 */, mode } = context
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
          
        } else if(/[a-z]/i.test(source[1])){  // tag
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
  // // 获取栈顶元素
  // const parent = ancestors[ancestors.length - 1];
  // // 遇到结束标签并且该标签与父节点标签同名就停止  
  // if(parent && context.source.startsWith(`</${parent.tag}>`)){
  //   return true
  // }

  // 更加合理的处理闭合标签
  // 以应对这种情况: <div><span></div></span> 当找不到匹配的闭合标签时, 将开始标签当作内容看待
  let i = ancestors.length
  while(i--){
    if(context.source.startsWith(`</${ancestors[i].tag}>`)){
      return true
    }
  }
  
  return false
}

export function parseElement(context: ParseContext, ancestors: Node[]): Node{
  const element = parseTag(context) // 解析并消费开始标签
  // 自闭和标签直接返回
  if(element.isSelfClosing) return element;

  ancestors.push(element)
  // 调用方式 parseChildren -> parseElement -> parseChildren
  // 每一次调用parseChildren都会开启一个状态机
  // 递归下降算法
  // 最终会构造出一颗树形结构的AST
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  if(context.source.startsWith(`</${element.tag}`)){
    parseTag(context, "end")  //解析并消费结束标签
  } else {
    console.error(`${element.tag} 缺少闭合标签`)
  }
  
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
  // Text</div> Text-{{ a }}</div>
  // endIdx 先取第一个 < 位置
  let endIdx = context.source.length 
  const ltIdx = context.source.indexOf("<");
  const delimiterIdx = context.source.indexOf("{{")
  if(ltIdx > -1 && ltIdx < endIdx){
    endIdx = ltIdx
  }
  if(delimiterIdx > -1 && delimiterIdx < endIdx){
    endIdx = delimiterIdx
  }

  // 提取文本
  const content = context.source.slice(0, endIdx);
  context.advanceBy(content.length)

  return {
    type: "Text",
    content
  }
}

// 解析开始/结束标签
function parseTag(context: ParseContext, type: "end" | "start" = "start"): Node{
  const { advanceBy, advanceSpaces } = context;
  const match = type === "start"
    // 匹配开始标签 <div > 匹配 <div match[0] = div
    ? /^<([a-z][^\t\r\n\f\s/>]*)/i.exec(context.source)
    // 匹配结束标签 </div> 匹配</div match[0] = div
    : /^<\/([a-z][^\t\r\n\f\s/>]*)/i.exec(context.source)

  const tag = match?.[1] || ""
  // 消费正则表达式匹配的全部内容
  advanceBy(match?.[0].length || 0)
  // 消费空字符
  advanceSpaces()

  // 解析并消费属性
  // props是`指令`节点和`属性`节点共同组成的数组
  const props = parseAttributes(context)

  // 如果剩余内容以/>结尾, 那就是自闭合标签 (不考虑props内容)
  const isSelfClosing = context.source.startsWith("/>")
  // 消费 /> 或 >
  advanceBy(isSelfClosing? 2: 1)

  return {
    type: "Element",
    tag,
    children: [],
    props,
    isSelfClosing
  }
}

function parseAttributes(context: ParseContext): Attribute[]{
  const props: Attribute[] = []
  const { advanceBy, advanceSpaces } = context
  // 持续解析直到遇见 > 或 />
  while(
    !context.source.startsWith(">") && 
    !context.source.startsWith("/>")
  ){
    // 解析属性或指令
    // key1 = "val1" key2 = " val2 " >
    const match = /^([^\t\r\n\f\s/>][^\t\r\n\f\s/>=]*)/i.exec(context.source)
    // key1 data-aria v-bind.xx
    const name = match?.[1] || ""
    advanceBy(name.length)
    advanceSpaces()
    // 紧接着应该是=
    if (!context.source.startsWith("=")) {
      console.error(`属性${name}不存在属性值`)
      advanceSpaces()
      props.push({
        type: "Attribute",
        name,
        value: ""
      })
      continue;
    }
    advanceBy(1)
    advanceSpaces()
    // "val1" key2 = " val2 " >
    const quote = context.source[0]
    let value = "";
    if(quote === "\"" || quote === "\'"){ // 被引号包裹
      advanceBy(1)
      // 下一个引号位置
      const next = context.source.indexOf(quote);
      if(next > -1){
        value = context.source.slice(0, next)
        advanceBy(value.length + 1)
      } else {
        console.error("缺少引号")
      }
    } else {
      // 属性值没有用引号括起来, 将空白字符前内容全部作为属性值
      const match = /^[^\t\r\n\f\s/>]+/.exec(context.source);
      value = match?.[0] || ""
      advanceBy(value.length)
    }
    advanceSpaces()
    props.push({
      type: "Attribute",
      name,
      value
    })
  }
  return props
}