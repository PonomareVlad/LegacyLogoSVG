import {scheduler} from "node:timers/promises";
import TeleBot from "telebot";
import fs from "fs";

const {
    TELEGRAM_USER_ID,
    TELEGRAM_BOT_TOKEN
} = process.env;

export class LogoSVGBot extends TeleBot {

    constructor(...args) {
        super(...args);
        this.on("text", msg => msg.reply.text(msg.text));
    }

    static getSetName = (name = "", username = "") => `${name.replaceAll(" ", "_")}_by_${username}`;

    async init() {
        const {username} = await this.getMe();
        this.username = username;
    }

    async request(...args) {
        let response;
        do {
            if (response) {
                console.error(response?.description);
                const timeout = response?.parameters?.retry_after || 10;
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
