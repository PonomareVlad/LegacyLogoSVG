import config from "../config.json" assert {type: "json"};
import {JSDOM, VirtualConsole} from "jsdom";
import {writeFileSync} from "fs";

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", () => []);

const {
    url,
    selector,
    joins = {},
    segments = [],
    excluded = [],
} = config;

const groups = {};
const response = await fetch(url);
const html = await response.text();
const {document} = new JSDOM(html, {virtualConsole})?.window;
const {innerHTML} = document.querySelector(selector);
const {
    props: {
        pageProps: {
            tags = [],
            logos = [],
            categories = []
        } = {}
    } = {}
} = JSON.parse(innerHTML);

logos.forEach((logo = {}) => {
    let {categories = [], files = []} = logo;
    files = files.map(file => file.replace('.svg', '.tgs'));
    if (files.length > 1) files = files.filter(file => file.endsWith('-icon.tgs') || file.endsWith('-icon-alt.tgs'));
    const category = categories.filter(category => !excluded.includes(category)).pop() || categories.pop() || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push({...logo, files});
})

excluded.forEach(key => groups[key] = groups[key].filter((logo = {}) => {
    const {tags = []} = logo;
    const segment = segments.find(segment => tags.includes(segment));
    if (!segment) return true;
    if (!groups[segment]) groups[segment] = [];
    groups[segment].push(logo);
}))

Object.entries(joins).forEach(([parent, childs = []]) => childs.forEach(child => {
    if (!groups[child] || !Array.isArray(groups[child])) return;
    if (!groups[parent]) groups[parent] = [];
    groups[parent] = [...groups[parent], ...groups[child]];
    delete groups[child];
}))

Object.entries(groups).forEach(([key, group]) => groups[key] = group.flatMap(({files = []}) => files).sort());

const stats = Object.fromEntries(Object.entries(groups).map(([group, items]) => [group, items.length]).sort(([, a], [, b]) => b - a))

writeFileSync('./groups.json', JSON.stringify(groups, null, 2));

console.debug(stats);
