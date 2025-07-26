module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/app-icon.ico',
    name: 'IT Support',
    executableName: 'ITSupport',
    overwrite: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
      config: {
        name: 'IT Support',
        icon: './assets/app-icon.ico',
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
}; 