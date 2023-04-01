import {scheduler} from "node:timers/promises";
import "telebot/plugins/regExpMessage.js";
import "telebot/plugins/shortReply.js";
import TeleBot from "telebot";
import sets from "./sets.mjs";
import fs from "fs";

const {
    TELEGRAM_USER_ID,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID = TELEGRAM_USER_ID,
} = process.env;

export class LogoSVGBot extends TeleBot {

    constructor(...args) {
        super(...args);
        this.on("text", this.text.bind(this));
        this.mod("message", this.constructor.message.bind(this));
    }

    static message(data) {
        if (data?.message?.text?.startsWith("/")) {
            const [name, ...words] = data.message.text.split(" ");
            Object.assign(data.message, {
                command: name.replace("/", ""), text: words.join(" "), isCommand: true
            });
        }
        return data;
    }

    static getSetName = (name = "", username = "") => `${name.replaceAll(" ", "_")}_by_${username}`;

    async text({command, text, reply = {}} = {}) {
        if (command) return reply.text("Please send name of logo for search", {asReply: true});
        const query = text.toLowerCase();
        const results = Object.entries(sets).filter(([, logos = []]) => {
            return logos.some((logo = {}) => {
                const {name, shortname, url, tags = [], categories = []} = logo;
                const keywords = [name, shortname, url, ...tags, ...categories].filter(Boolean);
                return keywords.map(keyword => keyword.toLowerCase()).some(keyword => keyword.includes(query));
            });
        }).map(([set] = []) => this.constructor.getSetName(set, this.username));
        if (!results.length) return reply.text(`No results, try send the correct brand name`, {asReply: true});
        await reply.text(`Found in ${results.length} set(s):`, {asReply: true});
        return Promise.all(results.map(setName => reply.text(`t.me/addemoji/${setName}`))).catch(e => e);
    }

    async init(options = {}) {
        this.options = options || {};
        const {username} = await this.getMe();
        this.username = username;
    }

    async request(...args) {
        let response;
        do {
            if (response) {
                console.error(response?.description);
                const timeout = response?.parameters?.retry_after || 10;
                if (timeout > 500) {
                    const text = `⏳ ${response?.description}`;
                    const chat_id = parseInt(TELEGRAM_CHAT_ID);
                    await super.request("/sendMessage", {text, chat_id}).catch(console.error);
                    if (typeof this?.options?.exit === "function") await this.options.exit();
                    process.exit(1);
                }
                await scheduler.wait((timeout * 1000) + 1000);
            }
            response = await super.request(...args).catch(e => e);
        } while (response?.error_code === 429);
        if (response?.error_code) throw response;
        return response;
    }

    async createNewStickerSet(data = {title: "", stickers: []}) {
        const {
            name,
            title,
            stickers = [],
            username = this.username,
            needs_repainting = false,
            sticker_format = "animated",
            sticker_type = "custom_emoji",
            user_id = parseInt(TELEGRAM_USER_ID),
        } = data || {};
        const form = {
            title,
            user_id,
            sticker_type,
            sticker_format,
            needs_repainting,
            stickers: JSON.stringify(stickers),
            name: this.constructor.getSetName(name || title, username),
        };
        const {result} = await this.request("/createNewStickerSet", form);
        return result;
    }

    async addStickerToSet(data = {name: "", sticker: {}}) {
        const {
            name,
            sticker = {},
            username = this.username,
            user_id = parseInt(TELEGRAM_USER_ID),
        } = data || {};
        const form = {
            user_id,
            sticker: JSON.stringify(sticker),
            name: this.constructor.getSetName(name, username)
        };
        const {result} = await this.request("/addStickerToSet", form);
        return result;
    }

    async setStickerPositionInSet(data = {}) {
        const {
            sticker,
            position,
        } = data || {};
        const form = {
            sticker,
            position,
        };
        const {result} = await this.request("/setStickerPositionInSet", form);
        return result;
    }

    async uploadStickerFile(data = {}) {
        const {
            file,
            path,
            buffer,
            filename = "sticker.tgs",
            sticker_format = "animated",
            user_id = parseInt(TELEGRAM_USER_ID),
        } = data || {};
        const value = buffer || file || fs.createReadStream(path);
        const form = {
            user_id,
            sticker_format,
            sticker: {
                value,
                options: {
                    filename
                }
            },
        };
        const {result} = await this.request("/uploadStickerFile", null, form);
        return result;
    }

    async deleteStickerSet(data = {}) {
        const {
            name,
            title,
            username = this.username,
        } = data || {};
        const form = {
            name: this.constructor.getSetName(name || title, username),
        };
        const {result} = await this.request("/deleteStickerSet", form);
        return result;
    }

    async getStickerSet(data = {}) {
        const {
            name,
            title,
            username = this.username,
        } = data || {};
        const form = {
            name: this.constructor.getSetName(name || title, username),
        };
        const {result} = await this.request("/getStickerSet", form);
        return result;
    }

}

export default new LogoSVGBot(TELEGRAM_BOT_TOKEN);
