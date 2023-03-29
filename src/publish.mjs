import sets from "../sets.json" assert {type: "json"};
import {serializeError} from "serialize-error";
import bot, {LogoSVGBot} from "./bot.mjs";
import Utils from "./utils.mjs";
import {md} from "telegram-md";

const {
    TELEGRAM_USER_ID,
    TELEGRAM_SET_SUFFIX,
    TELEGRAM_SET_APPENDIX,
    TELEGRAM_STICKER_EMOJI = "🖼️",
} = process.env;

const tgs = "./tgs/";
const user_id = parseInt(TELEGRAM_USER_ID);
const emojiList = [TELEGRAM_STICKER_EMOJI];

await bot.init();

const error = async (error, ...args) => {
    const json = JSON.stringify(serializeError(error), null, 2);
    const context = args.length ? ["⚠️", ...args, "—"].join(" ") : "⚠️";
    const message = md`${context} ${md.codeBlock(json, "json")}!`;
    await bot.sendMessage(user_id, message, {parseMode: "MarkdownV2"});
    console.error(error);
}

const setInfo = async (title, logos = []) => {
    const message = ["🗂", title, "—", logos.length].join(" ");
    await bot.sendMessage(user_id, message);
    console.log(message);
}

const sendLink = async name => {
    const setName = LogoSVGBot.getSetName(name, bot.username);
    const message = ["✨", `https://t.me/addemoji/${setName}`].join(" ");
    await bot.sendMessage(user_id, message);
    console.log(message);
}

const deleteSet = async name => {
    const status = await bot.deleteStickerSet({name}).catch(e => e);
    const message = ["🗑️", name, "—", JSON.stringify(status, null, 2)].join(" ");
    // await bot.sendMessage(user_id, message);
    console.log(message);
    return status;
}

const uploadSticker = async file => {
    const path = tgs + file;
    const {file_id} = await bot.uploadStickerFile({path});
    const message = ["💾", path, "—", !!file_id].join(" ");
    // await bot.sendMessage(user_id, message);
    console.log(message);
    return file_id;
}

const addSticker = async ({name, sticker, keywords, emoji_list = emojiList} = {}) => {
    const status = await bot.addStickerToSet({name, sticker: {sticker, emoji_list, keywords}});
    const message = ["🖼", keywords.at(0), "—", JSON.stringify(status, null, 2)].join(" ");
    // await bot.sendMessage(user_id, message);
    console.log(message);
    return status;
}

const createSet = async ({name, title, sticker, keywords, emoji_list = emojiList} = {}) => {
    const stickers = [{sticker, emoji_list, keywords}];
    const status = await bot.createNewStickerSet({name, title, stickers});
    const message = ["🎨", keywords.at(0), "—", JSON.stringify(status, null, 2)].join(" ");
    // await bot.sendMessage(user_id, message);
    console.log(message);
    return status;
}

for (let [key, logos = []] of Object.entries(sets)) {
    try {
        const id = Utils.capitalize(key);
        const name = [id, TELEGRAM_SET_SUFFIX].filter(Boolean).join("_");
        const title = [id, TELEGRAM_SET_APPENDIX].filter(Boolean).join(" ");
        await setInfo(title, logos);
        await deleteSet(name);
        let set;
        for (let logo of logos) {
            try {
                const {
                    shortname,
                    name: logoName,
                    tags = [],
                    stickers = [],
                    categories = [],
                } = logo || {};
                const keywords = [logoName, ...tags, ...categories, shortname].reduce((items, item) => {
                    return (items.join("").length + item.length) <= 64 ? [...items, item] : items;
                }, []);
                for (let file of stickers) {
                    try {
                        const sticker = await uploadSticker(file);
                        const data = {name, title, sticker, keywords};
                        if (!set) set = await createSet(data);
                        await addSticker(data);
                    } catch (e) {
                        await error(e, "File", file);
                    }
                }
            } catch (e) {
                await error(e, "Logo:", logo.shortname);
            }
        }
        await sendLink(name);
    } catch (e) {
        await error(e, "Set:", key);
    }
}
