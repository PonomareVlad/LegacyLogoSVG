import files from "../files.json" assert {type: "json"};
import sets from "../sets.json" assert {type: "json"};
import Utils from "./utils.mjs";
import bot from "./bot.mjs";

const {SETS_NEEDS_REPAINTING} = process.env;

await bot.init({exit: () => Utils.updateFiles(files)});
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
                    repaint = [],
                    stickers = [],
                    categories = [],
                } = logo || {};

                const keywords = [
                    logoName,
                    ...tags,
                    ...categories,
                    shortname,
                ].reduce(Utils.reduceKeywords, []).splice(0, 20);

                const targetFiles = SETS_NEEDS_REPAINTING ? repaint : stickers;

                for (let file of targetFiles) {
                    try {

                        if (!Utils.checkFile(file, files)) {
                            const sticker = await Utils.uploadSticker(file);
                            const data = {name, title, sticker, keywords};
                            if (!set) await Utils.createSet(data);
                            await Utils.addSticker(data);
                            set = await Utils.getSet(name);
                            files[file] = set.at(-1);
                        }

                        await Utils.setStickerPosition(files[file], position++);

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
