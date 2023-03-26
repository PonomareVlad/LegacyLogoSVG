export default {
    element: {
        exit: (node, parentNode) => {
            if (node.name === "defs") {
                const index = parentNode.children.indexOf(node);
                if (index > 0) {
                    const items = parentNode.children.splice(index, 1);
                    parentNode.children.unshift(...items);
                }
            }
        }
    }
}
