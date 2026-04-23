const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    intro_bundle : './src/intro.js',
    admin_dashboard_bundle: './src/filtering_request.js',
    seller_login_bundle: './src/sellerprofile.js',
    seller_board_bundle: './src/seller_board.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    // hon el name be brackets kermel tsir automaticaly la intro_bundel aw fliring_request 
    filename: '[name].js',
  },
  // This section tells Webpack how to handle different file types
  module: {
    rules: [
      {
        test: /\.m?js$/, // Look for .js and .mjs files
        resolve: {
          fullySpecified: false, // This is crucial for Firebase v9+ / v12
        },
      },
    ],
  },
  watch: true
};