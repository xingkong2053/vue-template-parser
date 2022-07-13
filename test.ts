import * as parser from "./src"
import fs from "fs"

const raw = `
  start
  <div >
    Text<span/>
    <image />
  </div>
`

const result = parser.parse(raw)
console.log(result)
fs.writeFileSync("result.json", JSON.stringify(result))