import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import plugin from "./plugin.mjs";
import {optimize} from "svgo";

const svg = "./svg/";
const logos = "./logos/logos/";

const options = {
    multipass: true,
    plugins: [
        "preset-default",
        {
            name: "Top <defs>",
            fn: () => plugin
        }
    ]
};

await mkdir(svg, {recursive: true});

for (const file of await readdir(logos)) {
    const source = await readFile(logos + file, {encoding: "utf8"});
    const {data} = optimize(source, options);
    await writeFile(svg + file, data);
    // console.debug(svg + file);
}
