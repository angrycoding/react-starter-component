# react-starter-component


Template for bootstrapping basic component structure with all build scripts / tsconfigs already embedded, just type:

```
npx react-starter-component my-new-component
```

Then do:

```
cd my-new-component
yarn
yarn start
```

Build it:

```
cd my-new-component
yarn
yarn build
```

## What's inside

- building everything into one index.js file and one index.d.ts.
- All images compressed
- All resources (such as images / fonts and so on) are converted into blobs, then converted into objectURLS (blob://...)
- CSS modules converted into CSS, compressed and embedded into JS
- all js files optimized and compressed
