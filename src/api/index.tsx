import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource.ts";

export const client = generateClient<Schema>();

export function checkErrors(errors: any[] | undefined) {
    if(errors) {
        console.log(errors);
        throw new Error(errors?.map((el) => el.message).join(','));
    }

}
