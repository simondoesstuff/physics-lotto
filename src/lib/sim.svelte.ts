import {getThemer, type Themer } from "$lib/theme.svelte";
import type {Engine, Render} from "matter-js";
import Matter from "$lib/svelteMatter.svelte";

let {Engine, Render, Runner, Bodies, Composite, Body, Common, Events} = $derived(Matter() || Object);


export abstract class MatterSim {
  protected readonly theme: Themer = getThemer();
  protected readonly canvas: HTMLCanvasElement;
  protected readonly engine: Engine;
  protected readonly render: Render;

  private oldWidth: number;
  private oldHeight: number;

  protected get width(): number {
    return this.canvas.clientWidth;
  }

  protected get height(): number {
    return this.canvas.clientHeight;
  }

  protected get center(): [number, number] {
    return [ this.width / 2, this.height / 2 ];
  };

  protected get planck() {
    const len = Math.min(this.width, this.height);
    return len / 1000;
  }

  constructor(canvas: HTMLCanvasElement) {
    if (!Matter()) throw new Error("Matter.js not loaded.");

    this.canvas = canvas;
    this.oldWidth = this.width;
    this.oldHeight = this.height;

    this.engine = Engine.create();

    this.render = Render.create({
      engine: this.engine,
      canvas: canvas,
      options: {
        width: this.width,
        height: this.height,
        devicePixelRatio: window.devicePixelRatio,
        wireframes: false,
        background: "transparent",
      },
    });

    Render.run(this.render);

    const runner = Runner.create();
    Runner.run(runner, this.engine);

    let tLast = Common.now();
    Events.on(this.engine, 'beforeUpdate', () => {
      let deltaTime = (Common.now() - tLast) / 1000;
      deltaTime = Math.min(deltaTime, 1 / 20);
      tLast = Common.now();
      this.fixedUpdate(deltaTime);
    });
  }

  protected fixedUpdate(deltaTime: number): void {}

  public abstract reTheme(): void;

  public reLayout(width, height) {
    const oldWidth = this.oldWidth;
    const oldHeight = this.oldHeight;

    const render = this.render;

    for (const body of Composite.allBodies(render.engine.world)) {
      const pos = body.position;
      const x = pos.x + (width - oldWidth) / 2;
      const y = pos.y + (height - oldHeight) / 2;
      Body.setPosition(body, {x, y});
    }

    render.bounds.max.x = width;
    render.bounds.max.y = height;
    render.options.width = width;
    render.options.height = height;
    render.canvas.width = width;
    render.canvas.height = height;
    Render.setPixelRatio(render, window.devicePixelRatio); // added this

    this.oldWidth = width;
    this.oldHeight = height;
  }

  public destroy() {
    Render.stop(this.render);
    this.render.canvas = null;
    Engine.clear(this.engine);
  }
}