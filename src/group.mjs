import config from "../config.json" assert {type: "json"};
import {writeFileSync} from "fs";
import Utils from "./utils.mjs";

const {
    tags = {},
    logos = {},
    title = {},
    excluded = [],
    categories = {},
    collects = "other",
} = config;

const groups = new Map();
const tagsJoin = Utils.getJoins(tags);
const logosJoin = Utils.getJoins(logos);
const joinedTags = Utils.getJoined(tags);
const joinedLogos = Utils.getJoined(logos);
const originalLogos = await Utils.fetchLogos();
const categoriesJoin = Utils.getJoins(categories);
const joinedCategories = Utils.getJoined(categories);

const categoriesMapper = category => {
    if (!joinedCategories.includes(category)) return category;
    return categoriesJoin[category];
}

originalLogos.map(logo => {

    const {
        shortname,
        tags = [],
        files = [],
        categories = [],
    } = logo || {};

    const targetFiles = files.length > 1 ? files.filter(Utils.variantsFilter) : files;

    logo.stickers = targetFiles.map(file => file.replace('.svg', '.tgs'));

    if (joinedLogos.includes(shortname)) {
        return Utils.getGroup(logosJoin[shortname], groups).add(logo);
    }

    const filteredCategories = categories.filter(category => !excluded.includes(category));
    const targetTags = tags.filter(tag => joinedTags.includes(tag));

    if (filteredCategories.length) {
        const targetCategories = Utils.getUniqItems(filteredCategories.map(categoriesMapper));
        return Utils.addByPriority(logo, groups, targetCategories);
    }

    if (targetTags.length) return Utils.addByPriority(logo, groups, targetTags, tagsJoin);

    return Utils.getGroup(collects, groups).add(logo);

});

Object.entries(categories).forEach(([parent, children]) => {
    children.forEach(child => Utils.mergeGroup(child, parent, groups));
});

groups.forEach((group, key) => !group.size ? groups.delete(key) : null);

const countByGroup = new Map(Utils.getUniqItems(groups.entries()).map(Utils.countByGroupMapper).sort(Utils.countByGroupSorter));
const countTotal = [...countByGroup.values()].reduce((sum, count) => sum + count, 0);
const countLogos = originalLogos.length;

[
    [countByGroup],
    ["Logos:", countLogos],
    ["Total:", countTotal],
].forEach(args => console.log(...args));

const sets = Object.fromEntries(Utils.getUniqItems(groups.entries()).map(([name, items]) => {
    return [title[name] || name, Utils.getUniqItems(items.values()).sort(Utils.logosSorter)];
}));

writeFileSync('./sets.json', JSON.stringify(sets, null, 2));
