declare module "nodejieba" {
  export interface LoadOptions {
    dict?: string;
    hmmDict?: string;
    userDict?: string;
    idfDict?: string;
    stopWordDict?: string;
  }

  export function load(options?: LoadOptions): void;
  export function cut(text: string, cutAll?: boolean): string[];
}
