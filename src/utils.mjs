import config from "../config.json" assert {type: "json"};
import {JSDOM} from "jsdom";

const {
    url,
    selector,
    priority = [],
    variants = [],
} = config;

export async function fetchLogos(targetUrl = url, targetSelector = selector) {
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

export const getUniqItems = items => [...new Set(items)];
export const getJoined = items => Object.values(items).flat();
export const countByGroupSorter = ([, a] = [], [, b] = []) => b - a;
export const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
export const prioritySorter = (a, b) => priority.indexOf(a) - priority.indexOf(b);
export const countByGroupMapper = ([name, items = new Set()]) => [name, items.size];
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

export const mergeGroup = (child, parent, groups = new Map()) => {
    const group = getGroup(parent, groups);
    getUniqItems(getGroup(child, groups).values()).forEach(item => group.add(item));
    groups.delete(child);
}

export const getGroup = (key, groups = new Map()) => {
    if (groups.has(key)) return groups.get(key);
    const group = new Set();
    groups.set(key, group);
    return group;
}

export default {
    countByGroupSorter,
    countByGroupMapper,
    variantsFilter,
    prioritySorter,
    addByPriority,
    getUniqItems,
    logosSorter,
    capitalize,
    mergeGroup,
    fetchLogos,
    getJoined,
    getJoins,
    getGroup,
}
