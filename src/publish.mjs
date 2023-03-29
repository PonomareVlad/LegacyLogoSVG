import groups from "../groups.json" assert {type: "json"};
import bot, {LogoSVGBot} from "./bot.mjs";

const {
    TELEGRAM_USER_ID,
} = process.env;

await bot.init();

const tgs = "./tgs/";
const suffix = "_test";
const emoji_list = ["🖼️"];
const branding = " @LogoSVG (test)";
const user_id = parseInt(TELEGRAM_USER_ID);
export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

for (let [name, files = []] of Object.entries(groups)) {
    try {
        name = capitalize(name);
        const title = name + branding;
        name = name + suffix;
        console.debug(name, title, files.length);
        await bot.deleteStickerSet({name}).catch(e => e);
        const path = tgs + files.shift();
        const {file_id: sticker} = await bot.uploadStickerFile({path});
        const stickers = [{sticker, emoji_list}];
        await bot.createNewStickerSet({name, title, stickers});
        let file;
        while (file = files.shift()) {
            try {
                const path = tgs + file;
                const {file_id: sticker} = await bot.uploadStickerFile({path});
                await bot.addStickerToSet({name, sticker: {sticker, emoji_list}});
                console.log(path, sticker);
            } catch (e) {
                console.error(e);
            }
        }
        const message = `https://t.me/addemoji/${LogoSVGBot.getSetName(name, bot.username)}`;
        await bot.sendMessage(user_id, message);
        console.log(message);
    } catch (e) {
        console.error(e);
    }
}

process.exit();