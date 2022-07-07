# Readme
The files in this folder is aimed to remedy an error occuring in IE11, where the file WHMEventSource included in the package 
@pmmmwh\react-refresh-webpack-plugin and that gets copied by the bat script contains some code, that is not supported by IE11. 
This is fixed in the newest version of the package "v0.5.0-rc2", but this is not yet referenced in the projects:
- @storybook\preset-create-react-app
- @storybook\react

that is used in our current storybook setup.

This ugly hack solves the issue currently, but should be removed when the @pmmmwh\react-refresh-webpack-plugin dependencies are updated to an IE11 compatible version.