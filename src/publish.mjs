import files from "../files.json" assert {type: "json"};
import sets from "../sets.json" assert {type: "json"};
import Utils from "./utils.mjs";
import bot from "./bot.mjs";

await bot.init();
await Utils.sendLinks(sets);

for (let [key, logos = []] of Object.entries(sets)) {
    try {

        const id = Utils.capitalize(key);
        const name = Utils.getSetName(id);
        const title = Utils.getSetTitle(id);
        await Utils.setInfo(title, logos);
        await Utils.deleteSet(name);

        let position = 0;
        let set = await Utils.getSet(name).catch(() => undefined);

        for (let logo of logos) {
            try {

                const {
                    shortname,
                    name: logoName,
                    tags = [],
                    stickers = [],
                    categories = [],
                } = logo || {};

                const keywords = [
                    logoName,
                    ...tags,
                    ...categories,
                    shortname,
                ].reduce(Utils.reduceKeywords, []).splice(0, 20);

                for (let file of stickers) {
                    try {

                        const sticker = files[file] ??= await Utils.uploadSticker(file);
                        const data = {name, title, sticker, keywords};

                        if (!set) {
                            await Utils.createSet(data);
                            set = await Utils.getSet(name);
                        }

                        if (!set.includes(sticker)) await Utils.addSticker(data);

                        await Utils.setStickerPosition(sticker, position++);

                    } catch (e) {
                        await Utils.error(e, "File:", file);
                    }
                }

            } catch (e) {
                await Utils.error(e, "Logo:", logo.shortname);
            }
        }

        await Utils.sendLink(name);

    } catch (e) {
        await Utils.error(e, "Set:", key);
    }

}

await Utils.updateFiles(files).catch(Utils.error);
