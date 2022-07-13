import * as parser from "./src"
import fs from "fs"

const raw = `
  start
  <div id="container" class="box">
    Text<span style=' background: #111111 '/>
    <image src @click="handler" v-on:mousedown.stop = "xxxx"/>
  </div>
`

const result = parser.parse(raw)
console.log(result)
fs.writeFileSync("result.json", JSON.stringify(result))