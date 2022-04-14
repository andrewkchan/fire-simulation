# fire-simulation
:fire: Real-time fire simulation on the GPU! 

<img src="https://raw.githubusercontent.com/andrewkchan/fire-simulation/master/fire_preview.gif">

- 2D Fluid simulation (uniform grid, simulating incompressible fluid with semi-lagrangian advection) 
- Thermal model for fire (buoyancy + cooling)
- Simulation steps are done in parallel on the GPU via WebGL fragment shaders

## Instructions
- `python3 -m http.server` in project root
- Go to `localhost:8000` or whatever port it starts at
- Interact with fire by clicking and dragging
