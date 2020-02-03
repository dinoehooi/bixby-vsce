# bixby-vsce README

This is the README for VS Code extension "bixby".

```
This extension is not an official Bixby tool, but I hope it will help you develop a capsule.
You can download Bixby studio from www.bixbydevelopers.com.
```

## Features
This VS code extension provides some tools for adding training data when developing a Bixby capsule
- `Training Explorer` shows training data by target and by goal
- provides a command detecting training duplications
- provides a command regrouping training files by goal
- provides a command gathering the tagged values of the type you entered and removing duplicate values. This feature is useful for finding OOV (Out Of Vocabulary).

## Requirements
VS Code

## Known Issues


## Release Notes
### 0.5.0
- Initial release

### 0.5.1
- Bug fix

### 0.5.2
- Add a command 'Gather tagged value by type'

### 0.5.3
- Remove the contribute definition of a language
- Support to add a bunch of new training data

### 0.5.4
- Node module update
- Improve the logic checking training duplication
- 