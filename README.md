# agenticcity

## Robot modes

Each robot in `index.html` runs a "mode" — a function that poses it every frame. The system lives in the big `<script>` block, in two places:

### 1. Setting each robot's mode

Near the top of `/* ---------- assemble desks ---------- */` (search for `robot mode assignment`), there's one variable per robot, in the same order as the `positions` array (robo1 = first desk, robo2 = second, ...):

```js
var robo1 = 'workingmode';
var robo2 = 'workingmode';
var robo3 = 'workingmode';
var robo4 = 'workingmode';
var robo5 = 'workingmode';
var robo6 = 'workingmode';
var ROBOT_MODES = [robo1, robo2, robo3, robo4, robo5, robo6];
```

To change what a robot does, just change its string, e.g. `var robo3 = 'idlemode';`.

### 2. Where modes are defined

Search for `/* ---------- robot behavior modes ---------- */` (just above `function animate()`). Each mode is a plain function `function modeNome(r, t)`, where `r` is the robot object and `t` is the elapsed clock time; it sets `r`'s position/rotation for that frame.

Modes that exist today:

- **`modeWorking`** (`'workingmode'`) — typing at the desk, with an occasional staggered coffee break (arm reaches the cup, lifts it to the mouth, holds, lowers it, releases).
- **`modeIdle`** (`'idlemode'`) — idle: sits still with a faint breathing bob, no typing, no coffee.
- **`modeSleeping`** (`'sleepingmode'`) — asleep: bows forward at the hips until the head rests on the desk (in the open space in front of the keyboard, clear of the monitor), with a "zzz" icon looping upward from the head and fading in/out.
- **`modeError`** (`'errormode'`) — malfunctioning: both hands clamp onto the sides of the head (same 2-bone IK as the coffee reach, aimed at the head instead of the cup, via the shared `ikAimArmAt` helper) while the whole body and head jitter/shake, the chest light flickers red-alert style, the desk lamp and floor LED outline tint a soft alert red, and the cup topples over with coffee spilled on the desk and dripping onto the floor beside it.

Right below all four functions, `ROBOT_MODE_HANDLERS` maps the mode name (the string used in `robo1..robo6`) to its function:

```js
var ROBOT_MODE_HANDLERS = {
  workingmode: modeWorking,
  idlemode: modeIdle,
  sleepingmode: modeSleeping,
  errormode: modeError
};
```

### 3. Adding a new mode

1. Write `function modeSeuNome(r, t){ ... }` next to `modeWorking`/`modeIdle`.
2. Add `seunomemode: modeSeuNome` to `ROBOT_MODE_HANDLERS`.
3. Assign it to a robot: `var robo2 = 'seunomemode';`.

If a robot's mode string doesn't match any key in `ROBOT_MODE_HANDLERS`, it silently falls back to `modeWorking`.
