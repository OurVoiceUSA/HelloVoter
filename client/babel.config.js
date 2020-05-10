module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    'module:metro-react-native-babel-preset',
  ],
  plugins: [
    'babel-plugin-styled-components',
    ['react-native-web', { commonjs: true }],
  ],
};
