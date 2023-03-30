import config from "../config.json" assert {type: "json"};
import {serializeError} from "serialize-error";
import bot, {LogoSVGBot} from "./bot.mjs";
import {Octokit} from "octokit";
import {md} from "telegram-md";
import {JSDOM} from "jsdom";

const {
    url,
    selector,
    priority = [],
    variants = [],
} = config || {};

const {
    GITHUB_TOKEN,
    TELEGRAM_USER_ID,
    SKIP_FILES_CHECK,
    SKIP_FILES_UPDATE,
    TELEGRAM_SET_SUFFIX,
    DELETE_EXISTING_SETS,
    VERCEL_GIT_REPO_SLUG,
    VERCEL_GIT_REPO_OWNER,
    SKIP_STICKER_ORDERING,
    TELEGRAM_SET_APPENDIX,
    TELEGRAM_STICKER_EMOJI = "🖼️",
    TELEGRAM_CHAT_ID = TELEGRAM_USER_ID,
} = process.env;

const tgs = "./tgs/";
const chat_id = parseInt(TELEGRAM_CHAT_ID);
const emojiList = [TELEGRAM_STICKER_EMOJI];

export const getUniqItems = items => [...new Set(items)];
export const getJoined = items => Object.values(items).flat();
export const countByGroupSorter = ([, a] = [], [, b] = []) => b - a;
export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
export const checkFile = (file, files = {}) => !SKIP_FILES_CHECK && file in files;
export const prioritySorter = (a, b) => priority.indexOf(a) - priority.indexOf(b);
export const getSetName = id => [id, TELEGRAM_SET_SUFFIX].filter(Boolean).join("_");
export const getSetTitle = id => [id, TELEGRAM_SET_APPENDIX].filter(Boolean).join(" ");
export const variantsFilter = file => variants.some(variant => file.endsWith(variant));
export const logosSorter = ({shortname: a} = {}, {shortname: b} = {}) => a.localeCompare(b);
export const joinMapper = ([parent, children = []]) => children.map(child => [child, parent]);
export const getJoins = items => Object.fromEntries(Object.entries(items).flatMap(joinMapper));

export const addByPriority = (logo = {}, groups = new Map(), targetItems = [], targetJoins = []) => {
    const hasPriority = targetItems.filter(item => priority.includes(item));
    if (hasPriority.length) {
        return getGroup(hasPriority.sort(prioritySorter).shift(), groups).add(logo);
    }
    const targetItem = targetItems.shift();
    const targetJoin = targetJoins[targetItem] || targetItem;
    return getGroup(targetJoin, groups).add(logo);
}

export const countByGroupMapper = ([name, items = new Set()]) => {
    return [name, getUniqItems(items.values()).flatMap(({stickers = []}) => stickers).length];
}

export const mergeGroup = (child, parent, groups = new Map()) => {
    const group = getGroup(parent, groups);
    getUniqItems(getGroup(child, groups).values()).forEach(item => group.add(item));
    groups.delete(child);
}

export const reduceKeywords = (items, item) => {
    return (items.join("").length + item.length) <= 64 ? [...items, item] : items;
}

export const fetchLogos = async (targetUrl = url, targetSelector = selector) => {
    const {window: {document} = {}} = await JSDOM.fromURL(targetUrl);
    const {innerHTML} = document.querySelector(targetSelector);
    const {
        props: {
            pageProps: {
                logos = [],
            } = {}
        } = {}
    } = JSON.parse(innerHTML);
    return logos;
}

export const getGroup = (key, groups = new Map()) => {
    if (groups.has(key)) return groups.get(key);
    const group = new Set();
    groups.set(key, group);
    return group;
}

export const addSticker = async ({name, sticker, keywords, emoji_list = emojiList} = {}) => {
    const status = await bot.addStickerToSet({name, sticker: {sticker, emoji_list, keywords}});
    const message = ["🖼", keywords.at(0), "—", JSON.stringify(status, null, 2)].join(" ");
    // await bot.sendMessage(chat_id, message);
    console.log(message);
    return status;
}

export const setStickerPosition = async (sticker, position = 0) => {
    if (SKIP_STICKER_ORDERING) return;
    const status = await bot.setStickerPositionInSet({sticker, position});
    const message = ["📌", position, "—", JSON.stringify(status, null, 2)].join(" ");
    // await bot.sendMessage(chat_id, message);
    console.log(message);
    return status;
}

export const createSet = async ({name, title, sticker, keywords, emoji_list = emojiList} = {}) => {
    const stickers = [{sticker, emoji_list, keywords}];
    const status = await bot.createNewStickerSet({name, title, stickers});
    const message = ["🎨", keywords.at(0), "—", JSON.stringify(status, null, 2)].join(" ");
    // await bot.sendMessage(chat_id, message);
    console.log(message);
    return status;
}

export const deleteSet = async name => {
    if (!DELETE_EXISTING_SETS) return;
    const status = await bot.deleteStickerSet({name}).catch(e => e);
    const message = ["🗑️", name, "—", JSON.stringify(status, null, 2)].join(" ");
    // await bot.sendMessage(chat_id, message);
    console.log(message);
    return status;
}

export const uploadSticker = async file => {
    const path = tgs + file;
    const {file_id} = await bot.uploadStickerFile({path});
    const message = ["💾", path, "—", !!file_id].join(" ");
    // await bot.sendMessage(chat_id, message);
    console.log(message);
    return file_id;
}

export const setInfo = async (title, logos = []) => {
    const stickers = logos.flatMap(({stickers = []}) => stickers);
    const message = ["🗂", title, "—", stickers.length].join(" ");
    await bot.sendMessage(chat_id, message);
    console.log(message);
}

export const sendLink = async name => {
    const setName = LogoSVGBot.getSetName(name, bot.username);
    const message = ["✨", `t.me/addemoji/${setName}`].join(" ");
    await bot.sendMessage(chat_id, message);
    console.log(message);
}

export const error = async (error, ...args) => {
    const json = JSON.stringify(serializeError(error), null, 2);
    const context = args.length ? ["⚠️", ...args].join(" ") : "⚠️";
    const message = md`${context}\r\n${md.codeBlock(json, "json")}`;
    await bot.sendMessage(chat_id, md.build(message), {parseMode: "MarkdownV2"});
    console.error(error);
}

export const log = async (...args) => {
    const message = args.join(" ");
    // await bot.sendMessage(chat_id, message);
    console.log(message);
}

export const getLinks = sets => {
    return Object.keys(sets).map(key => {
        const id = capitalize(key);
        const name = [id, TELEGRAM_SET_SUFFIX].filter(Boolean).join("_");
        const setName = LogoSVGBot.getSetName(name, bot.username);
        return `t.me/addemoji/${setName}`;
    });
}

export const sendLinks = async sets => {
    const links = getLinks(sets);
    const message = ["📦 Uploading sets:", links.join("\r\n\r\n")].join("\r\n\r\n");
    return bot.sendMessage(chat_id, message);
}

export const getSet = async name => {
    const {stickers = []} = await bot.getStickerSet({name});
    return stickers.map(({file_id} = {}) => file_id);
}

export const updateFiles = async files => {
    if (SKIP_FILES_UPDATE) return;
    const path = "files.json";
    const octokit = new Octokit({auth: GITHUB_TOKEN});
    const options = {
        path,
        repo: VERCEL_GIT_REPO_SLUG,
        owner: VERCEL_GIT_REPO_OWNER,
    }
    const {data: {sha} = {}} = await octokit.rest.repos.getContent(options).catch(() => ({}));
    const content = Buffer.from(JSON.stringify(files, null, 2), "utf8").toString("base64");
    const updateOptions = {...options, sha, content, message: path};
    const {status} = await octokit.rest.repos.createOrUpdateFileContents(updateOptions);
    const message = ["🗄️", Object.keys(files).length, "—", JSON.stringify(status, null, 2)].join(" ");
    await bot.sendMessage(chat_id, message);
    console.log(message);
    return status;
}

export default {
    countByGroupSorter,
    countByGroupMapper,
    setStickerPosition,
    reduceKeywords,
    variantsFilter,
    prioritySorter,
    addByPriority,
    uploadSticker,
    getUniqItems,
    logosSorter,
    updateFiles,
    getSetTitle,
    getSetName,
    capitalize,
    mergeGroup,
    fetchLogos,
    addSticker,
    sendLinks,
    getJoined,
    createSet,
    deleteSet,
    checkFile,
    getGroup,
    getJoins,
    getLinks,
    sendLink,
    setInfo,
    getSet,
    error,
    log,
}
