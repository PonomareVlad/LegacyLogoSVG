import config from "../config.json" assert {type: "json"};
import {JSDOM, VirtualConsole} from "jsdom";
import {writeFileSync} from "fs";

const {
    url,
    selector,
    tags = {},
    logos = {},
    title = {},
    excluded = [],
    priority = [],
    categories = {},
    collects = "other",
} = config;

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", () => []);

const response = await fetch(url);
const html = await response.text();
const {document} = new JSDOM(html, {virtualConsole})?.window;
const {innerHTML} = document.querySelector(selector);
const {
    props: {
        pageProps: {
            logos: logosArray = [],
        } = {}
    } = {}
} = JSON.parse(innerHTML);

const groups = new Map();

const getGroup = key => {
    if (groups.has(key)) return groups.get(key);
    const group = new Set();
    groups.set(key, group);
    return group;
}
const mergeGroup = (child, parent) => {
    const group = getGroup(parent);
    [...getGroup(child).values()].forEach(item => group.add(item));
    groups.delete(child);
}
const prioritySorter = (a, b) => priority.indexOf(a) - priority.indexOf(b);
const joinMapper = ([parent, children = []]) => children.map(child => [child, parent]);

const joinedTags = Object.values(tags).flat();
const joinedLogos = Object.values(logos).flat();
const joinedCategories = Object.values(categories).flat();
const tagsJoin = Object.fromEntries(Object.entries(tags).flatMap(joinMapper));
const logosJoin = Object.fromEntries(Object.entries(logos).flatMap(joinMapper));
const categoriesJoin = Object.fromEntries(Object.entries(categories).flatMap(joinMapper));

logosArray.map(logo => {
    const {
        shortname,
        tags = [],
        files = [],
        categories = [],
    } = logo || {};
    let targetFiles = files.map(file => file.replace('.svg', '.tgs'));
    if (targetFiles.length > 1) {
        targetFiles = targetFiles.filter(file =>
            file.endsWith('-icon-round.tgs') ||
            file.endsWith('-ignition.tgs') ||
            file.endsWith('-turbofan.tgs') ||
            file.endsWith('-vertical.tgs') ||
            file.endsWith('-icon-alt.tgs') ||
            file.endsWith('-octocat.tgs') ||
            file.endsWith('-freddie.tgs') ||
            file.endsWith('-tomster.tgs') ||
            file.endsWith('-classic.tgs') ||
            file.endsWith('-pirate.tgs') ||
            file.endsWith('-color.tgs') ||
            file.endsWith('-icon.tgs')
        );
    }
    if (joinedLogos.includes(shortname)) {
        // getGroup(logosJoin[shortname]).add(logo);
        const group = getGroup(logosJoin[shortname]);
        return targetFiles.forEach(file => group.add(file));
    }
    const filteredCategories = categories.filter(category => !excluded.includes(category));
    if (filteredCategories.length) {
        const targetCategories = [...new Set(filteredCategories.map(category => {
            if (!joinedCategories.includes(category)) return category;
            return categoriesJoin[category];
        }))];
        const hasPriority = targetCategories.filter(category => priority.includes(category));
        if (hasPriority.length) {
            const targetCategory = hasPriority.sort(prioritySorter).shift();
            const group = getGroup(targetCategory);
            return targetFiles.forEach(file => group.add(file));
        }
        const group = getGroup(targetCategories.shift());
        return targetFiles.forEach(file => group.add(file));
    }
    const targetTags = tags.filter(tag => joinedTags.includes(tag));
    if (!targetTags.length) {
        const group = getGroup(collects)
        return targetFiles.forEach(file => group.add(file));
    }
    const hasPriority = targetTags.filter(tag => priority.includes(tag));
    if (hasPriority.length) {
        const targetTag = hasPriority.sort(prioritySorter).shift();
        const group = getGroup(targetTag);
        return targetFiles.forEach(file => group.add(file));
    }
    const group = getGroup(tagsJoin[targetTags.shift()]);
    return targetFiles.forEach(file => group.add(file));
});

Object.entries(categories).forEach(([parent, children]) => children.forEach(child => mergeGroup(child, parent)));

const countByGroupSorter = ([, a] = [], [, b] = []) => b - a;
const countByGroupMapper = ([name, items = new Set()]) => [name, items.size];

groups.forEach((group, key) => !group.size ? groups.delete(key) : null);

const countByGroup = new Map([...groups.entries()].map(countByGroupMapper).sort(countByGroupSorter));
const countTotal = [...countByGroup.values()].reduce((sum, count) => sum + count, 0);
const countLogos = logosArray.length;

[
    [countByGroup],
    ["Logos:", countLogos],
    ["Total:", countTotal],
].forEach(args => console.log(...args));

const sets = Object.fromEntries([...groups.entries()].map(([name, items]) => {
    return [title[name] || name, [...items.values()]];
}));

writeFileSync('./groups.json', JSON.stringify(sets, null, 2));
