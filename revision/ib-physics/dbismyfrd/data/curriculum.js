/*
 * Symbol Sense curriculum data
 * Source: IB Physics data booklet, first assessment 2025, version 1.2.
 * Every printed equation line in themes A-E is represented once.
 * The answer key is authored from the physics, not supplied by the IB.
 */
(function (root, factory) {
  "use strict";
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.IB_PHYSICS_DATA = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var themes = [
    { id: "A", name: "Space, time and motion", short: "Motion" },
    { id: "B", name: "The particulate nature of matter", short: "Matter" },
    { id: "C", name: "Wave behaviour", short: "Waves" },
    { id: "D", name: "Fields", short: "Fields" },
    { id: "E", name: "Nuclear and quantum physics", short: "Quantum" }
  ];

  var topicRows = [
    ["A.1", "A", "Kinematics"],
    ["A.2", "A", "Forces and momentum"],
    ["A.3", "A", "Work, energy and power"],
    ["A.4", "A", "Rigid body mechanics"],
    ["A.5", "A", "Galilean and special relativity"],
    ["B.1", "B", "Thermal energy transfers"],
    ["B.2", "B", "Greenhouse effect"],
    ["B.3", "B", "Gas laws"],
    ["B.4", "B", "Thermodynamics"],
    ["B.5", "B", "Current and circuits"],
    ["C.1", "C", "Simple harmonic motion"],
    ["C.2", "C", "Wave model"],
    ["C.3", "C", "Wave phenomena"],
    ["C.4", "C", "Standing waves and resonance"],
    ["C.5", "C", "Doppler effect"],
    ["D.1", "D", "Gravitational fields"],
    ["D.2", "D", "Electric and magnetic fields"],
    ["D.3", "D", "Motion in electromagnetic fields"],
    ["D.4", "D", "Electromagnetic induction"],
    ["E.1", "E", "Structure of the atom"],
    ["E.2", "E", "Quantum physics"],
    ["E.3", "E", "Radioactive decay"],
    ["E.4", "E", "Fission"],
    ["E.5", "E", "Fusion and stars"]
  ];

  var topicMap = topicRows.reduce(function (map, row) {
    map[row[0]] = { code: row[0], theme: row[1], name: row[2] };
    return map;
  }, {});

  function S(token, canonical, accepted, unit) {
    return {
      token: token,
      display: token,
      canonical: canonical,
      accepted: accepted || [],
      unit: unit || ""
    };
  }

  function E(topic, order, name, level, latex, plain, symbols, note, page) {
    var meta = topicMap[topic];
    var id = topic.replace(".", "") + "-" + String(order).padStart(2, "0");
    return {
      id: id,
      theme: meta.theme,
      topic: topic,
      topicName: meta.name,
      level: level,
      order: order,
      bookletOrder: 0,
      bookletPage: page,
      name: name,
      latex: latex,
      plain: plain,
      note: note || "",
      symbols: symbols.map(function (symbol, index) {
        return {
          token: symbol.token,
          display: symbol.display,
          canonical: symbol.canonical,
          accepted: symbol.accepted.slice(),
          unit: symbol.unit,
          index: index
        };
      })
    };
  }

  var equations = [
    /* ---------------- A.1 Kinematics ---------------- */
    E("A.1", 1, "Displacement from average velocity", "core",
      "s = \\frac{u+v}{2}t",
      "s = ((u + v) / 2) t",
      [
        S("s", "displacement", ["distance travelled"], "m"),
        S("u", "initial velocity", ["initial speed"], "m s⁻¹"),
        S("v", "final velocity", ["final speed"], "m s⁻¹"),
        S("t", "time interval", ["time taken", "time"], "s")
      ],
      "For constant acceleration.", 6),

    E("A.1", 2, "Final velocity", "core",
      "v = u + at",
      "v = u + at",
      [
        S("v", "final velocity", ["final speed"], "m s⁻¹"),
        S("u", "initial velocity", ["initial speed"], "m s⁻¹"),
        S("a", "acceleration", [], "m s⁻²"),
        S("t", "time interval", ["time taken", "time"], "s")
      ],
      "For constant acceleration.", 6),

    E("A.1", 3, "Displacement with constant acceleration", "core",
      "s = ut + \\frac{1}{2}at^2",
      "s = ut + ½at²",
      [
        S("s", "displacement", ["distance travelled"], "m"),
        S("u", "initial velocity", ["initial speed"], "m s⁻¹"),
        S("a", "acceleration", [], "m s⁻²"),
        S("t", "time interval", ["time taken", "time"], "s")
      ],
      "For constant acceleration.", 6),

    E("A.1", 4, "Velocity-displacement relation", "core",
      "v^2 = u^2 + 2as",
      "v² = u² + 2as",
      [
        S("v", "final velocity", ["final speed"], "m s⁻¹"),
        S("u", "initial velocity", ["initial speed"], "m s⁻¹"),
        S("a", "acceleration", [], "m s⁻²"),
        S("s", "displacement", ["distance travelled"], "m")
      ],
      "For constant acceleration.", 6),

    /* ---------------- A.2 Forces and momentum ---------------- */
    E("A.2", 1, "Static friction limit", "core",
      "F_f \\le \\mu_s F_N",
      "F_f ≤ μ_s F_N",
      [
        S("F_f", "force of static friction", ["static friction force", "static friction"], "N"),
        S("μ_s", "coefficient of static friction", ["static coefficient of friction"], "dimensionless"),
        S("F_N", "normal force", ["normal reaction force", "normal reaction"], "N")
      ],
      "The static friction force cannot exceed this value.", 6),

    E("A.2", 2, "Dynamic friction", "core",
      "F_f = \\mu_d F_N",
      "F_f = μ_d F_N",
      [
        S("F_f", "force of dynamic friction", ["kinetic friction force", "dynamic friction force"], "N"),
        S("μ_d", "coefficient of dynamic friction", ["coefficient of kinetic friction", "dynamic coefficient of friction"], "dimensionless"),
        S("F_N", "normal force", ["normal reaction force", "normal reaction"], "N")
      ],
      "For a body sliding over a surface.", 6),

    E("A.2", 3, "Hooke's law", "core",
      "F_H = -kx",
      "F_H = −kx",
      [
        S("F_H", "restoring force", ["spring force", "force exerted by the spring"], "N"),
        S("k", "spring constant", ["force constant"], "N m⁻¹"),
        S("x", "extension or compression", ["extension", "compression", "displacement from equilibrium"], "m")
      ],
      "The minus sign indicates that the force opposes the displacement.", 6),

    E("A.2", 4, "Stokes' drag law", "core",
      "F_d = 6\\pi \\eta rv",
      "F_d = 6πηrv",
      [
        S("F_d", "drag force", ["viscous drag force", "viscous drag"], "N"),
        S("η", "dynamic viscosity", ["viscosity", "coefficient of viscosity"], "Pa s"),
        S("r", "radius of the sphere", ["radius"], "m"),
        S("v", "speed of the sphere relative to the fluid", ["speed", "velocity"], "m s⁻¹")
      ],
      "For slow motion of a smooth sphere through a viscous fluid.", 6),

    E("A.2", 5, "Buoyancy", "core",
      "F_b = \\rho Vg",
      "F_b = ρVg",
      [
        S("F_b", "buoyant force", ["upthrust", "buoyancy force"], "N"),
        S("ρ", "density of the fluid", ["fluid density"], "kg m⁻³"),
        S("V", "displaced volume", ["volume of fluid displaced", "submerged volume"], "m³"),
        S("g", "gravitational field strength", ["acceleration of free fall", "acceleration due to gravity"], "m s⁻²")
      ],
      "", 6),

    E("A.2", 6, "Weight", "core",
      "F_g = mg",
      "F_g = mg",
      [
        S("F_g", "gravitational force", ["weight", "force of gravity"], "N"),
        S("m", "mass", [], "kg"),
        S("g", "gravitational field strength", ["acceleration of free fall", "acceleration due to gravity"], "m s⁻²")
      ],
      "", 6),

    E("A.2", 7, "Linear momentum", "core",
      "p = mv",
      "p = mv",
      [
        S("p", "linear momentum", ["momentum"], "kg m s⁻¹"),
        S("m", "mass", [], "kg"),
        S("v", "velocity", ["speed"], "m s⁻¹")
      ],
      "", 6),

    E("A.2", 8, "Impulse", "core",
      "J = F\\Delta t",
      "J = FΔt",
      [
        S("J", "impulse", ["impulse of the force"], "N s"),
        S("F", "force", ["applied force"], "N"),
        S("Δt", "time interval", ["time taken", "duration of the force"], "s")
      ],
      "", 6),

    E("A.2", 9, "Newton's second law", "core",
      "F = ma = \\frac{\\Delta p}{\\Delta t}",
      "F = ma = Δp / Δt",
      [
        S("F", "resultant force", ["net force", "unbalanced force", "force"], "N"),
        S("m", "mass", [], "kg"),
        S("a", "acceleration", [], "m s⁻²"),
        S("Δp", "change in linear momentum", ["change in momentum", "change of momentum"], "kg m s⁻¹"),
        S("Δt", "time interval", ["time taken"], "s")
      ],
      "For a constant mass.", 6),

    E("A.2", 10, "Centripetal acceleration", "core",
      "a = \\frac{v^2}{r} = \\omega^2 r = \\frac{4\\pi^2 r}{T^2}",
      "a = v² / r = ω²r = 4π²r / T²",
      [
        S("a", "centripetal acceleration", ["acceleration"], "m s⁻²"),
        S("v", "speed", ["linear speed", "orbital speed"], "m s⁻¹"),
        S("r", "radius of the circular path", ["radius"], "m"),
        S("ω", "angular velocity", ["angular speed"], "rad s⁻¹"),
        S("T", "period", ["time period"], "s")
      ],
      "For uniform circular motion.", 6),

    E("A.2", 11, "Speed in circular motion", "core",
      "v = \\frac{2\\pi r}{T} = \\omega r",
      "v = 2πr / T = ωr",
      [
        S("v", "speed", ["linear speed", "tangential speed"], "m s⁻¹"),
        S("r", "radius of the circular path", ["radius"], "m"),
        S("T", "period", ["time period"], "s"),
        S("ω", "angular velocity", ["angular speed"], "rad s⁻¹")
      ],
      "For uniform circular motion.", 6),

    /* ---------------- A.3 Work, energy and power ---------------- */
    E("A.3", 1, "Work done by a force", "core",
      "W = Fs\\cos\\theta",
      "W = Fs cos θ",
      [
        S("W", "work done", ["work"], "J"),
        S("F", "force", ["applied force"], "N"),
        S("s", "displacement", ["distance moved", "distance"], "m"),
        S("θ", "angle between the force and the displacement", ["angle between force and displacement"], "rad")
      ],
      "", 6),

    E("A.3", 2, "Kinetic energy", "core",
      "E_k = \\frac{1}{2}mv^2 = \\frac{p^2}{2m}",
      "E_k = ½mv² = p² / (2m)",
      [
        S("E_k", "kinetic energy", [], "J"),
        S("m", "mass", [], "kg"),
        S("v", "speed", ["velocity"], "m s⁻¹"),
        S("p", "linear momentum", ["momentum"], "kg m s⁻¹")
      ],
      "", 6),

    E("A.3", 3, "Change in gravitational potential energy", "core",
      "\\Delta E_p = mg\\Delta h",
      "ΔE_p = mgΔh",
      [
        S("ΔE_p", "change in gravitational potential energy", ["change in GPE", "gravitational potential energy change"], "J"),
        S("m", "mass", [], "kg"),
        S("g", "gravitational field strength", ["acceleration of free fall", "acceleration due to gravity"], "m s⁻²"),
        S("Δh", "change in height", ["height difference", "vertical displacement"], "m")
      ],
      "Near a uniform gravitational field.", 6),

    E("A.3", 4, "Elastic potential energy", "core",
      "E_H = \\frac{1}{2}k(\\Delta x)^2",
      "E_H = ½k(Δx)²",
      [
        S("E_H", "elastic potential energy", ["spring potential energy", "elastic PE"], "J"),
        S("k", "spring constant", ["force constant"], "N m⁻¹"),
        S("Δx", "extension or compression", ["extension", "compression", "change in length"], "m")
      ],
      "", 6),

    E("A.3", 5, "Power", "core",
      "P = \\frac{\\Delta W}{\\Delta t} = Fv",
      "P = ΔW / Δt = Fv",
      [
        S("P", "power", [], "W"),
        S("ΔW", "work done", ["work"], "J"),
        S("Δt", "time interval", ["time taken"], "s"),
        S("F", "force", ["applied force"], "N"),
        S("v", "speed", ["velocity"], "m s⁻¹")
      ],
      "", 6),

    E("A.3", 6, "Efficiency", "core",
      "\\eta = \\frac{\\text{useful work out}}{\\text{total work in}} = \\frac{\\text{useful power out}}{\\text{total power in}}",
      "η = useful work out / total work in = useful power out / total power in",
      [
        S("η", "efficiency", [], "dimensionless")
      ],
      "Often expressed as a percentage.", 6),

    /* ---------------- A.4 Rigid body mechanics ---------------- */
    E("A.4", 1, "Torque", "ahl",
      "\\tau = Fr\\sin\\theta",
      "τ = Fr sin θ",
      [
        S("τ", "torque", ["moment of force", "turning moment"], "N m"),
        S("F", "force", ["applied force"], "N"),
        S("r", "distance from the pivot", ["perpendicular distance from the pivot", "lever arm", "radius"], "m"),
        S("θ", "angle between the force and the lever arm", ["angle between force and lever arm"], "rad")
      ],
      "", 7),

    E("A.4", 2, "Angular displacement from average angular velocity", "ahl",
      "\\Delta\\theta = \\frac{\\omega_f+\\omega_i}{2}t",
      "Δθ = ((ω_f + ω_i) / 2)t",
      [
        S("Δθ", "angular displacement", [], "rad"),
        S("ω_f", "final angular velocity", ["final angular speed"], "rad s⁻¹"),
        S("ω_i", "initial angular velocity", ["initial angular speed"], "rad s⁻¹"),
        S("t", "time interval", ["time taken", "time"], "s")
      ],
      "For constant angular acceleration.", 7),

    E("A.4", 3, "Angular velocity", "ahl",
      "\\omega_f = \\omega_i + \\alpha t",
      "ω_f = ω_i + αt",
      [
        S("ω_f", "final angular velocity", ["final angular speed"], "rad s⁻¹"),
        S("ω_i", "initial angular velocity", ["initial angular speed"], "rad s⁻¹"),
        S("α", "angular acceleration", [], "rad s⁻²"),
        S("t", "time interval", ["time taken", "time"], "s")
      ],
      "For constant angular acceleration.", 7),

    E("A.4", 4, "Angular displacement with constant angular acceleration", "ahl",
      "\\Delta\\theta = \\omega_i t + \\frac{1}{2}\\alpha t^2",
      "Δθ = ω_i t + ½αt²",
      [
        S("Δθ", "angular displacement", [], "rad"),
        S("ω_i", "initial angular velocity", ["initial angular speed"], "rad s⁻¹"),
        S("α", "angular acceleration", [], "rad s⁻²"),
        S("t", "time interval", ["time taken", "time"], "s")
      ],
      "For constant angular acceleration.", 7),

    E("A.4", 5, "Angular velocity-displacement relation", "ahl",
      "\\omega_f^2 = \\omega_i^2 + 2\\alpha\\Delta\\theta",
      "ω_f² = ω_i² + 2αΔθ",
      [
        S("ω_f", "final angular velocity", ["final angular speed"], "rad s⁻¹"),
        S("ω_i", "initial angular velocity", ["initial angular speed"], "rad s⁻¹"),
        S("α", "angular acceleration", [], "rad s⁻²"),
        S("Δθ", "angular displacement", [], "rad")
      ],
      "For constant angular acceleration.", 7),

    E("A.4", 6, "Moment of inertia", "ahl",
      "I = \\Sigma mr^2",
      "I = Σmr²",
      [
        S("I", "moment of inertia", ["rotational inertia"], "kg m²"),
        S("m", "mass of a particle", ["mass"], "kg"),
        S("r", "distance from the axis of rotation", ["distance from the axis", "radius"], "m")
      ],
      "The sum is taken over all particles that make up the body.", 7),

    E("A.4", 7, "Newton's second law for rotation", "ahl",
      "\\tau = I\\alpha",
      "τ = Iα",
      [
        S("τ", "torque", ["moment of force", "turning moment"], "N m"),
        S("I", "moment of inertia", ["rotational inertia"], "kg m²"),
        S("α", "angular acceleration", [], "rad s⁻²")
      ],
      "", 7),

    E("A.4", 8, "Angular momentum", "ahl",
      "L = I\\omega",
      "L = Iω",
      [
        S("L", "angular momentum", [], "kg m² s⁻¹"),
        S("I", "moment of inertia", ["rotational inertia"], "kg m²"),
        S("ω", "angular velocity", ["angular speed"], "rad s⁻¹")
      ],
      "", 7),

    E("A.4", 9, "Angular impulse", "ahl",
      "\\Delta L = \\tau\\Delta t",
      "ΔL = τΔt",
      [
        S("ΔL", "change in angular momentum", ["angular impulse"], "kg m² s⁻¹"),
        S("τ", "torque", ["moment of force", "turning moment"], "N m"),
        S("Δt", "time interval", ["time taken"], "s")
      ],
      "", 7),

    E("A.4", 10, "Change in angular momentum", "ahl",
      "\\Delta L = \\Delta(I\\omega)",
      "ΔL = Δ(Iω)",
      [
        S("ΔL", "change in angular momentum", ["change in rotational momentum"], "kg m² s⁻¹"),
        S("I", "moment of inertia", ["rotational inertia"], "kg m²"),
        S("ω", "angular velocity", ["angular speed"], "rad s⁻¹")
      ],
      "", 7),

    E("A.4", 11, "Rotational kinetic energy", "ahl",
      "E_k = \\frac{1}{2}I\\omega^2 = \\frac{L^2}{2I}",
      "E_k = ½Iω² = L² / (2I)",
      [
        S("E_k", "rotational kinetic energy", ["kinetic energy of rotation"], "J"),
        S("I", "moment of inertia", ["rotational inertia"], "kg m²"),
        S("ω", "angular velocity", ["angular speed"], "rad s⁻¹"),
        S("L", "angular momentum", [], "kg m² s⁻¹")
      ],
      "", 7),

    /* ---------------- A.5 Galilean and special relativity ---------------- */
    E("A.5", 1, "Galilean transformation of position", "ahl",
      "x' = x - vt",
      "x′ = x − vt",
      [
        S("x'", "position in the moving frame", ["position in frame S prime", "position in the moving frame"], "m"),
        S("x", "position in the original frame", ["position in frame S", "position"], "m"),
        S("v", "relative velocity", ["velocity of the moving frame"], "m s⁻¹"),
        S("t", "time", ["time interval"], "s")
      ],
      "", 7),

    E("A.5", 2, "Galilean transformation of time", "ahl",
      "t' = t",
      "t′ = t",
      [
        S("t'", "time in the moving frame", ["time in frame S prime"], "s"),
        S("t", "time in the original frame", ["time in frame S", "time"], "s")
      ],
      "In Galilean relativity, time is absolute.", 7),

    E("A.5", 3, "Galilean velocity addition", "ahl",
      "u' = u - v",
      "u′ = u − v",
      [
        S("u'", "velocity in the moving frame", ["velocity in frame S prime"], "m s⁻¹"),
        S("u", "velocity in the original frame", ["velocity in frame S"], "m s⁻¹"),
        S("v", "relative velocity", ["velocity of the moving frame"], "m s⁻¹")
      ],
      "", 7),

    E("A.5", 4, "Lorentz transformation of position", "ahl",
      "x' = \\gamma(x-vt) \\quad \\text{where } \\gamma = \\frac{1}{\\sqrt{1-\\frac{v^2}{c^2}}}",
      "x′ = γ(x − vt) where γ = 1 / √(1 − v²/c²)",
      [
        S("x'", "position in the moving frame", ["position in frame S prime"], "m"),
        S("γ", "Lorentz factor", ["gamma factor"], "dimensionless"),
        S("x", "position in the original frame", ["position in frame S"], "m"),
        S("v", "relative velocity", ["velocity of the moving frame"], "m s⁻¹"),
        S("t", "time", ["time interval"], "s"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹")
      ],
      "", 7),

    E("A.5", 5, "Lorentz transformation of time", "ahl",
      "t' = \\gamma\\left(t-\\frac{vx}{c^2}\\right)",
      "t′ = γ(t − vx / c²)",
      [
        S("t'", "time in the moving frame", ["time in frame S prime"], "s"),
        S("γ", "Lorentz factor", ["gamma factor"], "dimensionless"),
        S("t", "time in the original frame", ["time in frame S"], "s"),
        S("v", "relative velocity", ["velocity of the moving frame"], "m s⁻¹"),
        S("x", "position in the original frame", ["position in frame S"], "m"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹")
      ],
      "", 7),

    E("A.5", 6, "Relativistic velocity addition", "ahl",
      "u' = \\frac{u-v}{1-\\frac{uv}{c^2}}",
      "u′ = (u − v) / (1 − uv / c²)",
      [
        S("u'", "velocity in the moving frame", ["velocity in frame S prime"], "m s⁻¹"),
        S("u", "velocity in the original frame", ["velocity in frame S"], "m s⁻¹"),
        S("v", "relative velocity", ["velocity of the moving frame"], "m s⁻¹"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹")
      ],
      "", 7),

    E("A.5", 7, "Spacetime interval", "ahl",
      "(\\Delta s)^2 = (c\\Delta t)^2 - (\\Delta x)^2",
      "(Δs)² = (cΔt)² − (Δx)²",
      [
        S("Δs", "spacetime interval", ["interval"], "m"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹"),
        S("Δt", "time interval", ["time difference"], "s"),
        S("Δx", "spatial separation", ["change in position", "displacement along x"], "m")
      ],
      "The interval is invariant between inertial frames.", 7),

    E("A.5", 8, "Time dilation", "ahl",
      "\\Delta t = \\gamma\\Delta t_0",
      "Δt = γΔt₀",
      [
        S("Δt", "dilated time interval", ["time interval measured in the moving frame", "dilated time"], "s"),
        S("γ", "Lorentz factor", ["gamma factor"], "dimensionless"),
        S("Δt_0", "proper time interval", ["proper time", "rest time interval"], "s")
      ],
      "Δt₀ is measured in the rest frame of the event.", 7),

    E("A.5", 9, "Length contraction", "ahl",
      "L = \\frac{L_0}{\\gamma}",
      "L = L₀ / γ",
      [
        S("L", "contracted length", ["length measured in the moving frame", "contracted length"], "m"),
        S("L_0", "proper length", ["rest length", "proper length"], "m"),
        S("γ", "Lorentz factor", ["gamma factor"], "dimensionless")
      ],
      "L₀ is measured in the rest frame of the object.", 7),

    E("A.5", 10, "World-line angle", "ahl",
      "\\tan\\theta = \\frac{v}{c}",
      "tan θ = v / c",
      [
        S("θ", "angle between the world line and the time axis", ["angle between world line and time axis"], "rad"),
        S("v", "speed of the particle", ["speed"], "m s⁻¹"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹")
      ],
      "On a space-time diagram whose time axis is labelled ct.", 7),

    /* ---------------- B.1 Thermal energy transfers ---------------- */
    E("B.1", 1, "Density", "core",
      "\\rho = \\frac{m}{V}",
      "ρ = m / V",
      [
        S("ρ", "density", [], "kg m⁻³"),
        S("m", "mass", [], "kg"),
        S("V", "volume", [], "m³")
      ],
      "", 8),

    E("B.1", 2, "Average translational kinetic energy", "core",
      "\\bar{E}_k = \\frac{3}{2}k_BT",
      "Ē_k = (3/2)k_BT",
      [
        S("Ē_k", "average translational kinetic energy per molecule", ["average kinetic energy per particle", "mean translational kinetic energy"], "J"),
        S("k_B", "Boltzmann constant", ["Boltzmann's constant"], "J K⁻¹"),
        S("T", "thermodynamic temperature", ["absolute temperature", "temperature"], "K")
      ],
      "For an ideal gas.", 8),

    E("B.1", 3, "Specific heat capacity", "core",
      "Q = mc\\Delta T",
      "Q = mcΔT",
      [
        S("Q", "thermal energy transferred", ["heat", "heat energy", "thermal energy"], "J"),
        S("m", "mass", [], "kg"),
        S("c", "specific heat capacity", ["specific heat"], "J kg⁻¹ K⁻¹"),
        S("ΔT", "change in temperature", ["temperature change", "temperature difference"], "K")
      ],
      "Assuming no change of state.", 8),

    E("B.1", 4, "Latent heat", "core",
      "Q = mL",
      "Q = mL",
      [
        S("Q", "thermal energy transferred", ["heat", "heat energy", "thermal energy"], "J"),
        S("m", "mass", [], "kg"),
        S("L", "specific latent heat", ["latent heat"], "J kg⁻¹")
      ],
      "At constant temperature during a change of state.", 8),

    E("B.1", 5, "Thermal conduction", "core",
      "\\frac{\\Delta Q}{\\Delta t} = -kA\\frac{\\Delta T}{\\Delta x}",
      "ΔQ / Δt = −kA(ΔT / Δx)",
      [
        S("ΔQ", "thermal energy transferred", ["heat transferred", "thermal energy"], "J"),
        S("Δt", "time interval", ["time taken"], "s"),
        S("k", "thermal conductivity", ["coefficient of thermal conductivity"], "W m⁻¹ K⁻¹"),
        S("A", "cross-sectional area", ["area"], "m²"),
        S("ΔT", "temperature difference", ["change in temperature", "temperature gradient"], "K"),
        S("Δx", "thickness", ["distance", "length of the conductor"], "m")
      ],
      "The minus sign indicates energy transfer from hot to cold.", 8),

    E("B.1", 6, "Luminosity", "core",
      "L = \\sigma AT^4",
      "L = σAT⁴",
      [
        S("L", "luminosity", ["luminosity of the star", "power output of the star"], "W"),
        S("σ", "Stefan-Boltzmann constant", ["Stefan–Boltzmann constant"], "W m⁻² K⁻⁴"),
        S("A", "surface area", ["area", "surface area of the star"], "m²"),
        S("T", "surface temperature", ["thermodynamic temperature", "temperature"], "K")
      ],
      "For a black body.", 8),

    E("B.1", 7, "Apparent brightness", "core",
      "b = \\frac{L}{4\\pi d^2}",
      "b = L / (4πd²)",
      [
        S("b", "apparent brightness", ["brightness"], "W m⁻²"),
        S("L", "luminosity", ["luminosity of the star"], "W"),
        S("d", "distance to the star", ["distance"], "m")
      ],
      "Assuming isotropic emission.", 8),

    E("B.1", 8, "Wien's displacement law", "core",
      "\\lambda_{\\max}T = 2.9\\times10^{-3}\\,\\text{m K}",
      "λ_max T = 2.9 × 10⁻³ m K",
      [
        S("λ_max", "peak wavelength", ["wavelength of maximum intensity", "peak emission wavelength"], "m"),
        S("T", "thermodynamic temperature", ["surface temperature", "temperature"], "K")
      ],
      "The constant is 2.9 × 10⁻³ m K.", 8),

    /* ---------------- B.2 Greenhouse effect ---------------- */
    E("B.2", 1, "Emissivity", "core",
      "\\text{emissivity} = \\frac{\\text{power radiated per unit area}}{\\sigma T^4}",
      "emissivity = (power radiated per unit area) / (σT⁴)",
      [
        S("emissivity", "fraction of black-body power emitted at the same temperature", ["emittance"], "dimensionless"),
        S("σ", "Stefan-Boltzmann constant", ["Stefan–Boltzmann constant"], "W m⁻² K⁻⁴"),
        S("T", "thermodynamic temperature", ["temperature"], "K")
      ],
      "A black body has emissivity 1.", 8),

    E("B.2", 2, "Albedo", "core",
      "\\text{albedo} = \\frac{\\text{total scattered power}}{\\text{total incident power}}",
      "albedo = total scattered power / total incident power",
      [
        S("albedo", "fraction of incident power scattered or reflected", ["reflectivity", "reflection coefficient"], "dimensionless")
      ],
      "A perfectly reflective surface has albedo 1.", 8),

    /* ---------------- B.3 Gas laws ---------------- */
    E("B.3", 1, "Pressure", "core",
      "P = \\frac{F}{A}",
      "P = F / A",
      [
        S("P", "pressure", ["force per unit area"], "Pa"),
        S("F", "normal force", ["force", "force perpendicular to the area"], "N"),
        S("A", "area", ["cross-sectional area"], "m²")
      ],
      "", 8),

    E("B.3", 2, "Amount of substance", "core",
      "n = \\frac{N}{N_A}",
      "n = N / N_A",
      [
        S("n", "amount of substance", ["number of moles", "moles"], "mol"),
        S("N", "number of particles", ["number of molecules", "number of atoms"], "dimensionless"),
        S("N_A", "Avogadro constant", ["Avogadro's constant", "Avogadro's number"], "mol⁻¹")
      ],
      "", 8),

    E("B.3", 3, "Combined gas law", "core",
      "\\frac{PV}{T} = \\text{constant}",
      "PV / T = constant",
      [
        S("P", "pressure", [], "Pa"),
        S("V", "volume", [], "m³"),
        S("T", "thermodynamic temperature", ["absolute temperature", "temperature"], "K")
      ],
      "For a fixed mass of ideal gas.", 8),

    E("B.3", 4, "Ideal gas law", "core",
      "PV = nRT = Nk_BT",
      "PV = nRT = Nk_BT",
      [
        S("P", "pressure", [], "Pa"),
        S("V", "volume", [], "m³"),
        S("n", "amount of substance", ["number of moles", "moles"], "mol"),
        S("R", "molar gas constant", ["universal gas constant", "gas constant"], "J K⁻¹ mol⁻¹"),
        S("T", "thermodynamic temperature", ["absolute temperature", "temperature"], "K"),
        S("N", "number of particles", ["number of molecules", "number of atoms"], "dimensionless"),
        S("k_B", "Boltzmann constant", ["Boltzmann's constant"], "J K⁻¹")
      ],
      "For an ideal gas.", 8),

    E("B.3", 5, "Pressure from kinetic theory", "core",
      "P = \\frac{1}{3}\\rho v^2",
      "P = (1/3)ρv²",
      [
        S("P", "pressure", [], "Pa"),
        S("ρ", "density of the gas", ["gas density", "density"], "kg m⁻³"),
        S("v", "speed of the gas molecules", ["root mean square speed", "rms speed", "molecular speed"], "m s⁻¹")
      ],
      "The squared speed is the mean square speed of the molecules.", 8),

    E("B.3", 6, "Internal energy of an ideal gas", "core",
      "U = \\frac{3}{2}nRT = \\frac{3}{2}Nk_BT",
      "U = (3/2)nRT = (3/2)Nk_BT",
      [
        S("U", "internal energy", [], "J"),
        S("n", "amount of substance", ["number of moles", "moles"], "mol"),
        S("R", "molar gas constant", ["universal gas constant", "gas constant"], "J K⁻¹ mol⁻¹"),
        S("T", "thermodynamic temperature", ["absolute temperature", "temperature"], "K"),
        S("N", "number of particles", ["number of molecules", "number of atoms"], "dimensionless"),
        S("k_B", "Boltzmann constant", ["Boltzmann's constant"], "J K⁻¹")
      ],
      "For a monatomic ideal gas.", 8),

    /* ---------------- B.4 Thermodynamics ---------------- */
    E("B.4", 1, "First law of thermodynamics", "ahl",
      "Q = \\Delta U + W",
      "Q = ΔU + W",
      [
        S("Q", "thermal energy added to the system", ["heat added to the system", "heat supplied"], "J"),
        S("ΔU", "change in internal energy", ["increase in internal energy"], "J"),
        S("W", "work done by the gas", ["work done by the system", "work"], "J")
      ],
      "W is work done by the system.", 9),

    E("B.4", 2, "Work done by a gas", "ahl",
      "W = P\\Delta V",
      "W = PΔV",
      [
        S("W", "work done by the gas", ["work done by the system", "work"], "J"),
        S("P", "pressure", [], "Pa"),
        S("ΔV", "change in volume", ["volume change"], "m³")
      ],
      "At constant pressure.", 9),

    E("B.4", 3, "Change in internal energy", "ahl",
      "\\Delta U = \\frac{3}{2}nR\\Delta T = \\frac{3}{2}Nk_B\\Delta T",
      "ΔU = (3/2)nRΔT = (3/2)Nk_BΔT",
      [
        S("ΔU", "change in internal energy", ["increase in internal energy"], "J"),
        S("n", "amount of substance", ["number of moles", "moles"], "mol"),
        S("R", "molar gas constant", ["universal gas constant", "gas constant"], "J K⁻¹ mol⁻¹"),
        S("ΔT", "change in temperature", ["temperature change"], "K"),
        S("N", "number of particles", ["number of molecules", "number of atoms"], "dimensionless"),
        S("k_B", "Boltzmann constant", ["Boltzmann's constant"], "J K⁻¹")
      ],
      "For a monatomic ideal gas.", 9),

    E("B.4", 4, "Entropy change", "ahl",
      "\\Delta S = \\frac{\\Delta Q}{T}",
      "ΔS = ΔQ / T",
      [
        S("ΔS", "change in entropy", ["entropy change"], "J K⁻¹"),
        S("ΔQ", "thermal energy transferred reversibly", ["heat transferred", "thermal energy transferred"], "J"),
        S("T", "thermodynamic temperature", ["absolute temperature", "temperature"], "K")
      ],
      "For a reversible process at constant temperature.", 9),

    E("B.4", 5, "Statistical entropy", "ahl",
      "S = k_B\\ln\\Omega",
      "S = k_B ln Ω",
      [
        S("S", "entropy", [], "J K⁻¹"),
        S("k_B", "Boltzmann constant", ["Boltzmann's constant"], "J K⁻¹"),
        S("Ω", "number of microstates", ["number of possible microstates", "number of arrangements"], "dimensionless")
      ],
      "", 9),

    E("B.4", 6, "Adiabatic process", "ahl",
      "PV^{\\frac{5}{3}} = \\text{constant}",
      "PV^(5/3) = constant",
      [
        S("P", "pressure", [], "Pa"),
        S("V", "volume", [], "m³")
      ],
      "For a monatomic ideal gas.", 9),

    E("B.4", 7, "Thermodynamic efficiency", "ahl",
      "\\eta = \\frac{\\text{useful work}}{\\text{input energy}}",
      "η = useful work / input energy",
      [
        S("η", "efficiency", [], "dimensionless")
      ],
      "Often expressed as a percentage.", 9),

    E("B.4", 8, "Carnot efficiency", "ahl",
      "\\eta_{\\text{Carnot}} = 1 - \\frac{T_c}{T_h}",
      "η_Carnot = 1 − T_c / T_h",
      [
        S("η_Carnot", "Carnot efficiency", ["maximum efficiency", "efficiency of a Carnot cycle"], "dimensionless"),
        S("T_c", "cold reservoir temperature", ["temperature of the cold reservoir", "cold temperature"], "K"),
        S("T_h", "hot reservoir temperature", ["temperature of the hot reservoir", "hot temperature"], "K")
      ],
      "Temperatures must be in kelvin.", 9),

    /* ---------------- B.5 Current and circuits ---------------- */
    E("B.5", 1, "Electric current", "core",
      "I = \\frac{\\Delta q}{\\Delta t}",
      "I = Δq / Δt",
      [
        S("I", "electric current", ["current", "rate of flow of charge"], "A"),
        S("Δq", "charge flowing", ["charge", "quantity of charge"], "C"),
        S("Δt", "time interval", ["time taken"], "s")
      ],
      "", 9),

    E("B.5", 2, "Potential difference", "core",
      "V = \\frac{W}{q}",
      "V = W / q",
      [
        S("V", "potential difference", ["voltage", "p.d."], "V"),
        S("W", "work done", ["energy transferred", "work"], "J"),
        S("q", "charge", ["quantity of charge"], "C")
      ],
      "", 9),

    E("B.5", 3, "Resistance", "core",
      "R = \\frac{V}{I}",
      "R = V / I",
      [
        S("R", "resistance", [], "Ω"),
        S("V", "potential difference", ["voltage", "p.d."], "V"),
        S("I", "electric current", ["current"], "A")
      ],
      "", 9),

    E("B.5", 4, "Resistivity", "core",
      "\\rho = \\frac{RA}{L}",
      "ρ = RA / L",
      [
        S("ρ", "resistivity", [], "Ω m"),
        S("R", "resistance", [], "Ω"),
        S("A", "cross-sectional area", ["area"], "m²"),
        S("L", "length", ["length of the conductor"], "m")
      ],
      "", 9),

    E("B.5", 5, "Electrical power", "core",
      "P = IV = I^2R = \\frac{V^2}{R}",
      "P = IV = I²R = V² / R",
      [
        S("P", "electrical power", ["power"], "W"),
        S("I", "electric current", ["current"], "A"),
        S("V", "potential difference", ["voltage", "p.d."], "V"),
        S("R", "resistance", [], "Ω")
      ],
      "", 9),

    E("B.5", 6, "Series circuits — current", "core",
      "I = I_1 = I_2 = \\ldots",
      "I = I₁ = I₂ = …",
      [
        S("I", "total current", ["current"], "A"),
        S("I_1", "current through resistor 1", ["current in component 1"], "A"),
        S("I_2", "current through resistor 2", ["current in component 2"], "A")
      ],
      "In a series circuit the current is the same at every point.", 9),

    E("B.5", 7, "Series circuits — potential difference", "core",
      "V = V_1 + V_2 + \\ldots",
      "V = V₁ + V₂ + …",
      [
        S("V", "total potential difference", ["potential difference", "voltage"], "V"),
        S("V_1", "potential difference across component 1", ["voltage across component 1"], "V"),
        S("V_2", "potential difference across component 2", ["voltage across component 2"], "V")
      ],
      "In a series circuit the potential differences add.", 9),

    E("B.5", 8, "Series circuits — resistance", "core",
      "R_s = R_1 + R_2 + \\ldots",
      "R_s = R₁ + R₂ + …",
      [
        S("R_s", "equivalent series resistance", ["total series resistance"], "Ω"),
        S("R_1", "resistance of resistor 1", ["resistance of component 1"], "Ω"),
        S("R_2", "resistance of resistor 2", ["resistance of component 2"], "Ω")
      ],
      "", 9),

    E("B.5", 9, "Parallel circuits — current", "core",
      "I = I_1 + I_2 + \\ldots",
      "I = I₁ + I₂ + …",
      [
        S("I", "total current", ["current"], "A"),
        S("I_1", "current through branch 1", ["current in branch 1"], "A"),
        S("I_2", "current through branch 2", ["current in branch 2"], "A")
      ],
      "In a parallel circuit the branch currents add.", 9),

    E("B.5", 10, "Parallel circuits — potential difference", "core",
      "V = V_1 = V_2 = \\ldots",
      "V = V₁ = V₂ = …",
      [
        S("V", "potential difference", ["voltage"], "V"),
        S("V_1", "potential difference across branch 1", ["voltage across branch 1"], "V"),
        S("V_2", "potential difference across branch 2", ["voltage across branch 2"], "V")
      ],
      "In a parallel circuit the potential difference is the same across each branch.", 9),

    E("B.5", 11, "Parallel circuits — resistance", "core",
      "\\frac{1}{R_p} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\ldots",
      "1 / R_p = 1 / R₁ + 1 / R₂ + …",
      [
        S("R_p", "equivalent parallel resistance", ["total parallel resistance"], "Ω"),
        S("R_1", "resistance of resistor 1", ["resistance of component 1"], "Ω"),
        S("R_2", "resistance of resistor 2", ["resistance of component 2"], "Ω")
      ],
      "", 9),

    E("B.5", 12, "EMF and internal resistance", "core",
      "\\varepsilon = I(R+r)",
      "ε = I(R + r)",
      [
        S("ε", "electromotive force", ["emf"], "V"),
        S("I", "electric current", ["current"], "A"),
        S("R", "external resistance", ["load resistance"], "Ω"),
        S("r", "internal resistance", [], "Ω")
      ],
      "", 9),

    /* ---------------- C.1 Simple harmonic motion ---------------- */
    E("C.1", 1, "Defining equation of SHM", "core",
      "a = -\\omega^2 x",
      "a = −ω²x",
      [
        S("a", "acceleration", [], "m s⁻²"),
        S("ω", "angular frequency", ["angular velocity"], "rad s⁻¹"),
        S("x", "displacement from equilibrium", ["displacement"], "m")
      ],
      "The acceleration is proportional to the displacement and directed towards equilibrium.", 10),

    E("C.1", 2, "Period and frequency", "core",
      "T = \\frac{1}{f} = \\frac{2\\pi}{\\omega}",
      "T = 1 / f = 2π / ω",
      [
        S("T", "period", ["time period"], "s"),
        S("f", "frequency", [], "Hz"),
        S("ω", "angular frequency", ["angular velocity"], "rad s⁻¹")
      ],
      "", 10),

    E("C.1", 3, "Period of a mass-spring oscillator", "core",
      "T = 2\\pi\\sqrt{\\frac{m}{k}}",
      "T = 2π√(m / k)",
      [
        S("T", "period", ["time period"], "s"),
        S("m", "mass", [], "kg"),
        S("k", "spring constant", ["force constant"], "N m⁻¹")
      ],
      "", 10),

    E("C.1", 4, "Period of a simple pendulum", "core",
      "T = 2\\pi\\sqrt{\\frac{l}{g}}",
      "T = 2π√(l / g)",
      [
        S("T", "period", ["time period"], "s"),
        S("l", "length of the pendulum", ["length", "string length"], "m"),
        S("g", "gravitational field strength", ["acceleration of free fall", "acceleration due to gravity"], "m s⁻²")
      ],
      "For small oscillations.", 10),

    E("C.1", 5, "Displacement in SHM", "ahl",
      "x = x_0\\sin(\\omega t+\\phi)",
      "x = x₀ sin(ωt + φ)",
      [
        S("x", "displacement at time t", ["displacement"], "m"),
        S("x_0", "amplitude", ["maximum displacement"], "m"),
        S("ω", "angular frequency", ["angular velocity"], "rad s⁻¹"),
        S("t", "time", ["time interval"], "s"),
        S("φ", "phase angle", ["phase constant", "initial phase"], "rad")
      ],
      "", 10),

    E("C.1", 6, "Velocity in SHM", "ahl",
      "v = \\omega x_0\\cos(\\omega t+\\phi)",
      "v = ωx₀ cos(ωt + φ)",
      [
        S("v", "velocity", ["speed"], "m s⁻¹"),
        S("ω", "angular frequency", ["angular velocity"], "rad s⁻¹"),
        S("x_0", "amplitude", ["maximum displacement"], "m"),
        S("t", "time", ["time interval"], "s"),
        S("φ", "phase angle", ["phase constant", "initial phase"], "rad")
      ],
      "", 10),

    E("C.1", 7, "Velocity-displacement relation in SHM", "ahl",
      "v = \\pm\\omega\\sqrt{x_0^2-x^2}",
      "v = ±ω√(x₀² − x²)",
      [
        S("v", "velocity", ["speed"], "m s⁻¹"),
        S("ω", "angular frequency", ["angular velocity"], "rad s⁻¹"),
        S("x_0", "amplitude", ["maximum displacement"], "m"),
        S("x", "displacement", ["displacement from equilibrium"], "m")
      ],
      "", 10),

    E("C.1", 8, "Total energy in SHM", "ahl",
      "E_T = \\frac{1}{2}m\\omega^2x_0^2",
      "E_T = ½mω²x₀²",
      [
        S("E_T", "total energy", ["total energy of the oscillation"], "J"),
        S("m", "mass", [], "kg"),
        S("ω", "angular frequency", ["angular velocity"], "rad s⁻¹"),
        S("x_0", "amplitude", ["maximum displacement"], "m")
      ],
      "", 10),

    E("C.1", 9, "Potential energy in SHM", "ahl",
      "E_p = \\frac{1}{2}m\\omega^2x^2",
      "E_p = ½mω²x²",
      [
        S("E_p", "potential energy", ["elastic potential energy", "potential energy of the oscillator"], "J"),
        S("m", "mass", [], "kg"),
        S("ω", "angular frequency", ["angular velocity"], "rad s⁻¹"),
        S("x", "displacement", ["displacement from equilibrium"], "m")
      ],
      "", 10),

    /* ---------------- C.2 Wave model ---------------- */
    E("C.2", 1, "Wave speed", "core",
      "v = f\\lambda = \\frac{\\lambda}{T}",
      "v = fλ = λ / T",
      [
        S("v", "wave speed", ["speed", "wave velocity"], "m s⁻¹"),
        S("f", "frequency", [], "Hz"),
        S("λ", "wavelength", [], "m"),
        S("T", "period", ["time period"], "s")
      ],
      "", 10),

    /* ---------------- C.3 Wave phenomena ---------------- */
    E("C.3", 1, "Snell's law", "core",
      "\\frac{n_1}{n_2} = \\frac{\\sin\\theta_2}{\\sin\\theta_1} = \\frac{v_2}{v_1}",
      "n₁ / n₂ = sin θ₂ / sin θ₁ = v₂ / v₁",
      [
        S("n_1", "refractive index of medium 1", ["refractive index of the first medium"], "dimensionless"),
        S("n_2", "refractive index of medium 2", ["refractive index of the second medium"], "dimensionless"),
        S("θ_1", "angle of incidence", ["incident angle"], "rad"),
        S("θ_2", "angle of refraction", ["refracted angle"], "rad"),
        S("v_1", "speed of light in medium 1", ["wave speed in medium 1"], "m s⁻¹"),
        S("v_2", "speed of light in medium 2", ["wave speed in medium 2"], "m s⁻¹")
      ],
      "", 10),

    E("C.3", 2, "Constructive interference", "core",
      "\\text{path difference} = n\\lambda",
      "path difference = nλ",
      [
        S("path difference", "difference in distances travelled by the two waves", ["difference in path lengths"], "m"),
        S("n", "order number", ["order", "integer"], "dimensionless"),
        S("λ", "wavelength", [], "m")
      ],
      "For constructive interference.", 10),

    E("C.3", 3, "Destructive interference", "core",
      "\\text{path difference} = \\left(n+\\frac{1}{2}\\right)\\lambda",
      "path difference = (n + ½)λ",
      [
        S("path difference", "difference in distances travelled by the two waves", ["difference in path lengths"], "m"),
        S("n", "order number", ["order", "integer"], "dimensionless"),
        S("λ", "wavelength", [], "m")
      ],
      "For destructive interference.", 10),

    E("C.3", 4, "Double-slit fringe spacing", "core",
      "s = \\frac{\\lambda D}{d}",
      "s = λD / d",
      [
        S("s", "fringe spacing", ["fringe separation", "distance between adjacent fringes"], "m"),
        S("λ", "wavelength", [], "m"),
        S("D", "distance from the slits to the screen", ["distance to the screen"], "m"),
        S("d", "slit separation", ["distance between the slits"], "m")
      ],
      "For small angles.", 10),

    E("C.3", 5, "Single-slit first minimum", "ahl",
      "\\theta = \\frac{\\lambda}{b}",
      "θ = λ / b",
      [
        S("θ", "angular position of the first minimum", ["angle of the first minimum", "diffraction angle"], "rad"),
        S("λ", "wavelength", [], "m"),
        S("b", "slit width", ["width of the slit"], "m")
      ],
      "For the first minimum.", 11),

    E("C.3", 6, "Diffraction grating maxima", "ahl",
      "n\\lambda = d\\sin\\theta",
      "nλ = d sin θ",
      [
        S("n", "order number", ["order", "integer"], "dimensionless"),
        S("λ", "wavelength", [], "m"),
        S("d", "grating spacing", ["slit separation", "distance between adjacent slits"], "m"),
        S("θ", "diffraction angle", ["angle of diffraction"], "rad")
      ],
      "", 11),

    /* ---------------- C.5 Doppler effect ---------------- */
    E("C.5", 1, "Doppler shift for light", "core",
      "\\frac{\\Delta f}{f} = \\frac{\\Delta\\lambda}{\\lambda} \\approx \\frac{v}{c}",
      "Δf / f = Δλ / λ ≈ v / c",
      [
        S("Δf", "change in frequency", ["frequency shift"], "Hz"),
        S("f", "source frequency", ["emitted frequency", "frequency of the source"], "Hz"),
        S("Δλ", "change in wavelength", ["wavelength shift"], "m"),
        S("λ", "wavelength", [], "m"),
        S("v", "relative speed", ["relative velocity", "speed of the source or observer"], "m s⁻¹"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹")
      ],
      "For v much less than c.", 10),

    E("C.5", 2, "Doppler effect — moving source", "ahl",
      "f' = f\\left(\\frac{v}{v \\pm u_s}\\right)",
      "f′ = f(v / (v ± u_s))",
      [
        S("f'", "observed frequency", ["frequency observed by the observer"], "Hz"),
        S("f", "source frequency", ["emitted frequency", "frequency of the source"], "Hz"),
        S("v", "speed of sound", ["speed of the wave", "wave speed"], "m s⁻¹"),
        S("u_s", "speed of the source", ["source speed"], "m s⁻¹")
      ],
      "The sign depends on whether the source moves towards or away from the observer.", 11),

    E("C.5", 3, "Doppler effect — moving observer", "ahl",
      "f' = f\\left(\\frac{v \\pm u_o}{v}\\right)",
      "f′ = f((v ± u_o) / v)",
      [
        S("f'", "observed frequency", ["frequency observed by the observer"], "Hz"),
        S("f", "source frequency", ["emitted frequency", "frequency of the source"], "Hz"),
        S("v", "speed of sound", ["speed of the wave", "wave speed"], "m s⁻¹"),
        S("u_o", "speed of the observer", ["observer speed"], "m s⁻¹")
      ],
      "The sign depends on whether the observer moves towards or away from the source.", 11),

    /* ---------------- D.1 Gravitational fields ---------------- */
    E("D.1", 1, "Newton's law of gravitation", "core",
      "F = G\\frac{m_1m_2}{r^2}",
      "F = G m₁m₂ / r²",
      [
        S("F", "gravitational force", ["force of gravity", "gravitational attraction"], "N"),
        S("G", "gravitational constant", ["universal gravitational constant", "Newton's gravitational constant"], "N m² kg⁻²"),
        S("m_1", "mass of body 1", ["first mass"], "kg"),
        S("m_2", "mass of body 2", ["second mass"], "kg"),
        S("r", "distance between the centres", ["separation", "distance between the masses"], "m")
      ],
      "", 12),

    E("D.1", 2, "Gravitational field strength", "core",
      "g = \\frac{F}{m} = G\\frac{M}{r^2}",
      "g = F / m = GM / r²",
      [
        S("g", "gravitational field strength", ["acceleration of free fall", "acceleration due to gravity"], "N kg⁻¹"),
        S("F", "gravitational force", ["force of gravity"], "N"),
        S("m", "mass of the test mass", ["mass"], "kg"),
        S("G", "gravitational constant", ["universal gravitational constant"], "N m² kg⁻²"),
        S("M", "mass of the central body", ["mass of the source mass", "central mass"], "kg"),
        S("r", "distance from the centre", ["distance from the centre of the mass"], "m")
      ],
      "", 12),

    E("D.1", 3, "Gravitational potential energy", "ahl",
      "E_p = -G\\frac{m_1m_2}{r}",
      "E_p = −G m₁m₂ / r",
      [
        S("E_p", "gravitational potential energy", ["gravitational potential energy of the system"], "J"),
        S("G", "gravitational constant", ["universal gravitational constant"], "N m² kg⁻²"),
        S("m_1", "mass of body 1", ["first mass"], "kg"),
        S("m_2", "mass of body 2", ["second mass"], "kg"),
        S("r", "distance between the centres", ["separation", "distance between the masses"], "m")
      ],
      "The zero of potential energy is at infinity.", 12),

    E("D.1", 4, "Gravitational potential", "ahl",
      "V_g = -G\\frac{M}{r}",
      "V_g = −GM / r",
      [
        S("V_g", "gravitational potential", [], "J kg⁻¹"),
        S("G", "gravitational constant", ["universal gravitational constant"], "N m² kg⁻²"),
        S("M", "mass of the central body", ["central mass", "source mass"], "kg"),
        S("r", "distance from the centre", ["distance from the centre of the mass"], "m")
      ],
      "The zero of potential is at infinity.", 12),

    E("D.1", 5, "Field strength from potential", "ahl",
      "g = -\\frac{\\Delta V_g}{\\Delta r}",
      "g = −ΔV_g / Δr",
      [
        S("g", "gravitational field strength", ["acceleration of free fall"], "N kg⁻¹"),
        S("ΔV_g", "change in gravitational potential", ["potential difference"], "J kg⁻¹"),
        S("Δr", "change in distance", ["distance interval", "radial distance interval"], "m")
      ],
      "", 12),

    E("D.1", 6, "Work done in a gravitational field", "ahl",
      "W = m\\Delta V_g",
      "W = mΔV_g",
      [
        S("W", "work done", ["work"], "J"),
        S("m", "mass", [], "kg"),
        S("ΔV_g", "change in gravitational potential", ["potential difference"], "J kg⁻¹")
      ],
      "", 12),

    E("D.1", 7, "Escape speed", "ahl",
      "v_{\\text{esc}} = \\sqrt{\\frac{2GM}{r}}",
      "v_esc = √(2GM / r)",
      [
        S("v_esc", "escape speed", ["escape velocity"], "m s⁻¹"),
        S("G", "gravitational constant", ["universal gravitational constant"], "N m² kg⁻²"),
        S("M", "mass of the central body", ["central mass", "source mass"], "kg"),
        S("r", "distance from the centre", ["distance from the centre of the mass"], "m")
      ],
      "", 12),

    E("D.1", 8, "Orbital speed", "ahl",
      "v_{\\text{orbital}} = \\sqrt{\\frac{GM}{r}}",
      "v_orbital = √(GM / r)",
      [
        S("v_orbital", "orbital speed", ["orbital velocity"], "m s⁻¹"),
        S("G", "gravitational constant", ["universal gravitational constant"], "N m² kg⁻²"),
        S("M", "mass of the central body", ["central mass", "source mass"], "kg"),
        S("r", "orbital radius", ["distance from the centre", "radius of the orbit"], "m")
      ],
      "For a circular orbit.", 12),

    /* ---------------- D.2 Electric and magnetic fields ---------------- */
    E("D.2", 1, "Coulomb's law", "core",
      "F = k\\frac{q_1q_2}{r^2} \\quad \\text{where } k = \\frac{1}{4\\pi\\varepsilon_0}",
      "F = k q₁q₂ / r² where k = 1 / (4πε₀)",
      [
        S("F", "electric force", ["electrostatic force", "Coulomb force"], "N"),
        S("k", "Coulomb constant", ["electrostatic constant", "Coulomb's constant"], "N m² C⁻²"),
        S("q_1", "charge of body 1", ["first charge"], "C"),
        S("q_2", "charge of body 2", ["second charge"], "C"),
        S("r", "distance between the charges", ["separation"], "m"),
        S("ε_0", "permittivity of free space", ["vacuum permittivity", "electric constant"], "C² N⁻¹ m⁻²")
      ],
      "", 12),

    E("D.2", 2, "Electric field strength", "core",
      "E = \\frac{F}{q}",
      "E = F / q",
      [
        S("E", "electric field strength", ["electric field"], "N C⁻¹"),
        S("F", "electric force", ["force on the charge"], "N"),
        S("q", "charge", ["test charge"], "C")
      ],
      "", 12),

    E("D.2", 3, "Uniform electric field", "core",
      "E = \\frac{V}{d}",
      "E = V / d",
      [
        S("E", "electric field strength", ["electric field"], "N C⁻¹"),
        S("V", "potential difference", ["voltage", "p.d."], "V"),
        S("d", "separation of the plates", ["distance between the plates", "plate separation"], "m")
      ],
      "For a uniform field between parallel plates.", 12),

    E("D.2", 4, "Electric potential energy", "ahl",
      "E_p = k\\frac{q_1q_2}{r}",
      "E_p = k q₁q₂ / r",
      [
        S("E_p", "electric potential energy", ["electrostatic potential energy"], "J"),
        S("k", "Coulomb constant", ["electrostatic constant", "Coulomb's constant"], "N m² C⁻²"),
        S("q_1", "charge of body 1", ["first charge"], "C"),
        S("q_2", "charge of body 2", ["second charge"], "C"),
        S("r", "distance between the charges", ["separation"], "m")
      ],
      "", 12),

    E("D.2", 5, "Electric potential", "ahl",
      "V_e = k\\frac{Q}{r}",
      "V_e = kQ / r",
      [
        S("V_e", "electric potential", [], "V"),
        S("k", "Coulomb constant", ["electrostatic constant", "Coulomb's constant"], "N m² C⁻²"),
        S("Q", "charge", ["source charge"], "C"),
        S("r", "distance from the charge", ["distance"], "m")
      ],
      "", 12),

    E("D.2", 6, "Electric field from potential", "ahl",
      "E = -\\frac{\\Delta V_e}{\\Delta r}",
      "E = −ΔV_e / Δr",
      [
        S("E", "electric field strength", ["electric field"], "N C⁻¹"),
        S("ΔV_e", "change in electric potential", ["potential difference"], "V"),
        S("Δr", "change in distance", ["distance interval"], "m")
      ],
      "", 12),

    E("D.2", 7, "Work and electric potential difference", "ahl",
      "W = q\\Delta V_e",
      "W = qΔV_e",
      [
        S("W", "work done", ["work"], "J"),
        S("q", "charge", ["charge moved"], "C"),
        S("ΔV_e", "change in electric potential", ["potential difference"], "V")
      ],
      "", 12),

    /* ---------------- D.3 Motion in electromagnetic fields ---------------- */
    E("D.3", 1, "Magnetic force on a moving charge", "core",
      "F = qvB\\sin\\theta",
      "F = qvB sin θ",
      [
        S("F", "magnetic force", ["magnetic force on the charge", "Lorentz force"], "N"),
        S("q", "charge", ["charge of the particle"], "C"),
        S("v", "speed", ["velocity"], "m s⁻¹"),
        S("B", "magnetic flux density", ["magnetic field strength", "magnetic field"], "T"),
        S("θ", "angle between the velocity and the magnetic field", ["angle between velocity and magnetic field"], "rad")
      ],
      "", 12),

    E("D.3", 2, "Magnetic force on a current-carrying wire", "core",
      "F = BIL\\sin\\theta",
      "F = BIL sin θ",
      [
        S("F", "magnetic force", ["force on the wire"], "N"),
        S("B", "magnetic flux density", ["magnetic field strength", "magnetic field"], "T"),
        S("I", "electric current", ["current"], "A"),
        S("L", "length of the wire", ["length"], "m"),
        S("θ", "angle between the current and the magnetic field", ["angle between current and magnetic field"], "rad")
      ],
      "", 12),

    E("D.3", 3, "Force between parallel wires", "core",
      "\\frac{F}{L} = \\mu_0\\frac{I_1I_2}{2\\pi r}",
      "F / L = μ₀ I₁I₂ / (2πr)",
      [
        S("F/L", "force per unit length", ["force per metre"], "N m⁻¹"),
        S("μ_0", "permeability of free space", ["vacuum permeability", "magnetic constant"], "T m A⁻¹"),
        S("I_1", "current in wire 1", ["first current"], "A"),
        S("I_2", "current in wire 2", ["second current"], "A"),
        S("r", "separation between the wires", ["distance between the wires"], "m")
      ],
      "", 12),

    /* ---------------- D.4 Induction ---------------- */
    E("D.4", 1, "Magnetic flux", "ahl",
      "\\Phi = BA\\cos\\theta",
      "Φ = BA cos θ",
      [
        S("Φ", "magnetic flux", [], "Wb"),
        S("B", "magnetic flux density", ["magnetic field strength", "magnetic field"], "T"),
        S("A", "area", ["area of the loop"], "m²"),
        S("θ", "angle between the magnetic field and the normal to the area", ["angle between field and the normal to the area"], "rad")
      ],
      "", 13),

    E("D.4", 2, "Faraday's law", "ahl",
      "\\varepsilon = -N\\frac{\\Delta\\Phi}{\\Delta t}",
      "ε = −N ΔΦ / Δt",
      [
        S("ε", "induced electromotive force", ["induced emf"], "V"),
        S("N", "number of turns", ["number of turns in the coil"], "dimensionless"),
        S("ΔΦ", "change in magnetic flux", ["magnetic flux change"], "Wb"),
        S("Δt", "time interval", ["time taken"], "s")
      ],
      "The minus sign represents Lenz's law.", 13),

    E("D.4", 3, "EMF of a moving conductor", "ahl",
      "\\varepsilon = BvL",
      "ε = BvL",
      [
        S("ε", "induced electromotive force", ["induced emf"], "V"),
        S("B", "magnetic flux density", ["magnetic field strength", "magnetic field"], "T"),
        S("v", "speed of the conductor", ["velocity"], "m s⁻¹"),
        S("L", "length of the conductor", ["length"], "m")
      ],
      "", 13),

    /* ---------------- E.1 Structure of the atom ---------------- */
    E("E.1", 1, "Photon energy", "core",
      "E = hf",
      "E = hf",
      [
        S("E", "photon energy", ["energy of a photon"], "J"),
        S("h", "Planck constant", ["Planck's constant"], "J s"),
        S("f", "frequency", ["frequency of the photon"], "Hz")
      ],
      "", 13),

    E("E.1", 2, "Nuclear radius", "ahl",
      "R = R_0A^{\\frac{1}{3}}",
      "R = R₀A^(1/3)",
      [
        S("R", "nuclear radius", ["radius of the nucleus"], "m"),
        S("R_0", "Fermi radius", ["nuclear radius constant"], "m"),
        S("A", "nucleon number", ["mass number"], "dimensionless")
      ],
      "", 13),

    E("E.1", 3, "Hydrogen energy levels", "ahl",
      "E_n = -\\frac{13.6}{n^2}\\,\\text{eV}",
      "E_n = −13.6 / n² eV",
      [
        S("E_n", "energy of the nth energy level", ["energy of the nth level", "energy level"], "eV"),
        S("n", "principal quantum number", ["energy level number", "quantum number"], "dimensionless")
      ],
      "For the hydrogen atom.", 13),

    E("E.1", 4, "Quantised angular momentum", "ahl",
      "mvr = \\frac{nh}{2\\pi}",
      "mvr = nh / (2π)",
      [
        S("m", "mass of the electron", ["electron mass"], "kg"),
        S("v", "speed of the electron", ["electron speed"], "m s⁻¹"),
        S("r", "orbital radius", ["radius of the orbit"], "m"),
        S("n", "principal quantum number", ["quantum number"], "dimensionless"),
        S("h", "Planck constant", ["Planck's constant"], "J s")
      ],
      "Bohr model of the hydrogen atom.", 13),

    /* ---------------- E.2 Quantum physics ---------------- */
    E("E.2", 1, "Photoelectric equation", "ahl",
      "E_{\\max} = hf - \\Phi",
      "E_max = hf − Φ",
      [
        S("E_max", "maximum kinetic energy of the photoelectron", ["maximum kinetic energy", "maximum photoelectron energy"], "J"),
        S("h", "Planck constant", ["Planck's constant"], "J s"),
        S("f", "frequency of the incident light", ["incident frequency"], "Hz"),
        S("Φ", "work function", ["work function of the metal"], "J")
      ],
      "", 13),

    E("E.2", 2, "de Broglie wavelength", "ahl",
      "\\lambda = \\frac{h}{p} = \\frac{h}{mv}",
      "λ = h / p = h / (mv)",
      [
        S("λ", "de Broglie wavelength", ["matter wavelength"], "m"),
        S("h", "Planck constant", ["Planck's constant"], "J s"),
        S("p", "linear momentum", ["momentum"], "kg m s⁻¹"),
        S("m", "mass", [], "kg"),
        S("v", "speed", ["velocity"], "m s⁻¹")
      ],
      "", 13),

    E("E.2", 3, "Compton scattering", "ahl",
      "\\lambda_f - \\lambda_i = \\Delta\\lambda = \\frac{h}{m_ec}(1-\\cos\\theta)",
      "λ_f − λ_i = Δλ = (h / (m_e c))(1 − cos θ)",
      [
        S("λ_f", "final photon wavelength", ["scattered photon wavelength"], "m"),
        S("λ_i", "initial photon wavelength", ["incident photon wavelength"], "m"),
        S("Δλ", "change in wavelength", ["wavelength shift"], "m"),
        S("h", "Planck constant", ["Planck's constant"], "J s"),
        S("m_e", "electron rest mass", ["rest mass of the electron"], "kg"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹"),
        S("θ", "scattering angle", ["angle of scattering"], "rad")
      ],
      "", 13),

    /* ---------------- E.3 Radioactive decay ---------------- */
    E("E.3", 1, "Mass-energy equivalence", "core",
      "E = mc^2",
      "E = mc²",
      [
        S("E", "rest energy", ["rest energy equivalent", "mass-energy equivalent"], "J"),
        S("m", "mass", [], "kg"),
        S("c", "speed of light in vacuum", ["speed of light"], "m s⁻¹")
      ],
      "", 13),

    E("E.3", 2, "Decay law", "ahl",
      "N = N_0e^{-\\lambda t}",
      "N = N₀e^(−λt)",
      [
        S("N", "number of undecayed nuclei", ["number of nuclei remaining", "number of radioactive nuclei"], "dimensionless"),
        S("N_0", "initial number of undecayed nuclei", ["initial number of nuclei"], "dimensionless"),
        S("λ", "decay constant", [], "s⁻¹"),
        S("t", "time", ["time interval"], "s")
      ],
      "The base e is Euler's number and is not graded.", 13),

    E("E.3", 3, "Activity", "ahl",
      "A = \\lambda N = \\lambda N_0e^{-\\lambda t}",
      "A = λN = λN₀e^(−λt)",
      [
        S("A", "activity", ["activity of the sample", "decay rate"], "Bq"),
        S("λ", "decay constant", [], "s⁻¹"),
        S("N", "number of undecayed nuclei", ["number of nuclei remaining", "number of radioactive nuclei"], "dimensionless"),
        S("N_0", "initial number of undecayed nuclei", ["initial number of nuclei"], "dimensionless"),
        S("t", "time", ["time interval"], "s")
      ],
      "", 13),

    E("E.3", 4, "Half-life", "ahl",
      "T_{\\frac{1}{2}} = \\frac{\\ln 2}{\\lambda}",
      "T₁/₂ = ln 2 / λ",
      [
        S("T₁/₂", "half-life", ["half life"], "s"),
        S("λ", "decay constant", [], "s⁻¹")
      ],
      "", 13),

    /* ---------------- E.5 Fusion and stars ---------------- */
    E("E.5", 1, "Distance from parallax", "core",
      "d(\\text{parsec}) = \\frac{1}{p(\\text{arc-second})}",
      "d(parsec) = 1 / p(arc-second)",
      [
        S("d", "distance to the star in parsecs", ["distance in parsecs", "distance"], "pc"),
        S("p", "parallax angle in arcseconds", ["parallax angle", "parallax"], "arcsecond")
      ],
      "The small-angle approximation is used.", 13)
  ];

  equations.forEach(function (equation, index) {
    equation.bookletOrder = index + 1;
  });

  var topics = topicRows.map(function (row) {
    var code = row[0];
    var related = equations.filter(function (equation) { return equation.topic === code; });
    var levels = related.reduce(function (set, equation) {
      set[equation.level] = true;
      return set;
    }, {});
    return {
      code: code,
      theme: row[1],
      name: row[2],
      equationCount: related.length,
      promptCount: related.reduce(function (sum, equation) { return sum + equation.symbols.length; }, 0),
      levels: Object.keys(levels)
    };
  });

  var themeStats = themes.map(function (theme) {
    var related = equations.filter(function (equation) { return equation.theme === theme.id; });
    return {
      id: theme.id,
      name: theme.name,
      short: theme.short,
      equationCount: related.length,
      promptCount: related.reduce(function (sum, equation) { return sum + equation.symbols.length; }, 0),
      coreCount: related.filter(function (equation) { return equation.level === "core"; }).length,
      ahlCount: related.filter(function (equation) { return equation.level === "ahl"; }).length
    };
  });

  var stats = {
    equationCount: equations.length,
    promptCount: equations.reduce(function (sum, equation) { return sum + equation.symbols.length; }, 0),
    coreCount: equations.filter(function (equation) { return equation.level === "core"; }).length,
    ahlCount: equations.filter(function (equation) { return equation.level === "ahl"; }).length,
    themeCounts: themeStats.reduce(function (map, theme) {
      map[theme.id] = theme.equationCount;
      return map;
    }, {})
  };

  return {
    version: "2025.1.2",
    generatedAt: "2026-10-28",
    source: {
      title: "IB Physics data booklet",
      edition: "First assessment 2025, version 1.2",
      note: "Equations transcribed for study. Answer key authored from the physics; the IB does not publish a symbol key."
    },
    themes: themes,
    themeStats: themeStats,
    topics: topics,
    equations: equations,
    stats: stats
  };
});
