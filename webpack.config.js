const path = require("path");
const webpack = require("webpack");
const ESLintPlugin = require("eslint-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = (env, argv) => ({
  entry: "./src/index.tsx",
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      state: path.resolve(__dirname, "src/state"),
      components: path.resolve(__dirname, "src/components"),
      actions: path.resolve(__dirname, "src/actions"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(woff(2)?|eot|ttf|otf|svg|txt)$/,
        type: "asset/inline",
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|csv)$/i,
        type: "asset/resource",
      },
      {
        test: /\.css$/i,
        loader: "css-loader",
        options: {
          url: true,
        },
      },
    ],
  },

  devServer: {
    // contentBase: path.join(__dirname, "build"),
    hot: argv && argv.mode === "production" ? false : true,
    historyApiFallback: true,
    host: "0.0.0.0",
    compress: true,
    port: env.PORT || 3044,
    // publicPath: "/",
  },
  devtool: "source-map",
  output: {
    filename: "[name].bundle.js",
    publicPath: "/",
    path: path.resolve(__dirname, "build"),
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "index.html"),
      favicon: "./public/images/favicon.svg",
    }),
    new CopyPlugin({
      patterns: [
        { from: "public", to: "public" },
        { from: "dist", to: "dist" },
      ],
    }),
    new ESLintPlugin(),
  ],
});
