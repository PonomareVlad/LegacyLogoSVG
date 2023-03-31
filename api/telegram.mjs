import {start} from "telebot-vercel"
import bot from "../src/bot.mjs"

await bot.init()

export default start({bot})
