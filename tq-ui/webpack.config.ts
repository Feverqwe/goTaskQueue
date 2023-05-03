import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as Path from 'path';
import * as CopyPlugin from 'copy-webpack-plugin';
import {CallableOption} from 'webpack-cli';

const getOptions: CallableOption = (env, argv) => ({
  entry: {
    index: './src/index',
  },
  output: {
    filename: '[name]-[contenthash].js',
    chunkFilename: '[contenthash].chunk.js',
    path: Path.resolve(__dirname, './dist'),
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          name: 'commons',
          chunks: 'initial',
          minChunks: 2,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.png$/,
        use: [
          {
            loader: 'url-loader',
          },
        ],
      },
      {
        test: /\.(less|css)$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/assets/index.html',
      chunks: ['index'],
      scriptLoading: 'blocking',
    }),
    new CopyPlugin({
      patterns: [{from: './src/assets/icons', to: 'icons'}],
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
});

export default getOptions;
