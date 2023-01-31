const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
})

const isDev = process.env.NODE_ENV === "development";

module.exports = withNextra({
  assetPrefix: !isDev ? "/bagman/" : "",
  images: {
    unoptimized: true
  }
});