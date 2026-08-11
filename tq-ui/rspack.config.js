const path = require('node:path');
const {rspack} = require('@rspack/core');

/** @type {import('@rspack/core').RspackOptionsFunction} */
module.exports = (_env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    entry: {
      index: './src/index',
    },
    output: {
      filename: '[name]-[contenthash].js',
      chunkFilename: '[contenthash].chunk.js',
      cssFilename: '[name]-[contenthash].css',
      cssChunkFilename: '[contenthash].chunk.css',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
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
    performance: {
      hints: false,
    },
    module: {
      rules: [
        {
          test: /\.(?:js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              detectSyntax: 'auto',
              jsc: {
                target: 'es2020',
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: isDevelopment,
                  },
                },
              },
            },
          },
        },
        {
          test: /\.png$/,
          type: 'asset/inline',
        },
        {
          test: /\.css$/,
          type: 'css',
        },
      ],
    },
    experiments: {
      css: true,
    },
    plugins: [
      new rspack.HtmlRspackPlugin({
        filename: 'index.html',
        template: './src/assets/index.html',
        chunks: ['index'],
        scriptLoading: 'blocking',
      }),
      new rspack.CopyRspackPlugin({
        patterns: [{from: './src/assets/icons', to: 'icons'}],
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  };
};
