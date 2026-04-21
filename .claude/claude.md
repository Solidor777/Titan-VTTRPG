# Project Description

This is a Foundry Virtual Tabletop implementation of the TITAN RPG system as laid out in the TITAN Rules Compendium.md
file. The goal is to provide a fully functional RPG system that can be used to play the game. Priorities are
customizable automation for ease of play, simple and intuitive user interface, good sustainability of the codebase, and
good documentation.

# Project Resources

This project is coded in JavaScript, Svelte, and SCSS. It makes particular use of the TyphonJS Runtime Library Foundry
VTT, documented at https://typhonjs-fvtt-lib.github.io/api-docs/. Everything that is built is stored in the ~/src/
directory. The build output is stored in the root. Nothing that is not built should be stored in the ~/src/ directory.

# Code Style

The wrap limit is 120 characters. All function declarations should have comments describing the function's purpose. All
variables, properties, and parameters should be properly typed and wrapped in {} braces. Optional parameters or
properties should use [] braces. Properties and parameters should have a - between the type and name of the property.
All variable declarations should be typed and have a comment explaining what is being done or what the variable is for.
All class declarations should be properly typed. All object definitions should use @extends and @typedef as appropriate.
@typof should be used as appropriate. All functions should have a typed return value, and a description if they return
other than void, or if they return after an async operation. All function declaration comments should be multiline. All
variable declarations should be single-line is they can fit within the wrap limit. All objects should be multiline if
they have more than one property. All arrays should be multiline if they have more than one entry. All svelte components
should be multiline if they have more than one property, with the > or /> on a newline. All conditional code should
be scoped in multiline {}. All comments should have proper grammar, spelling, punctuation, and indentation.

# Response to instructions

On start, check for any incomplete tasks and ask whether you should resume them. When I ask you to do something, first
ask me any necessary clarifying questions before doing the work. Then analyze the situation and give me a clear and
concise description of your plan for handling the task. Save that plan to a file for future reference. Then confirm with
me whether you should proceed. If the task has multiple steps or options, confirm with me which ones you should perform.
