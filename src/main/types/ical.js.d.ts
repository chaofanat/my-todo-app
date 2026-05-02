declare module 'ical.js' {
  export function parse(input: string): any[];

  export class Component {
    constructor(jcalData: any[]);
    getAllSubcomponents(name: string): Component[];
    getFirstPropertyValue(name: string): any;
  }

  export class Event {
    constructor(component: Component);
    uid: string;
    summary: string;
    description: string | null;
    location: string | null;
    startDate: Time;
    endDate: Time | null;
  }

  export class Time {
    isDate: boolean;
    toJSDate(): Date;
  }
}
