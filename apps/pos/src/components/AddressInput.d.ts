export interface AddressResult {
    addressLine: string;
    lat: number | null;
    lng: number | null;
}
interface AddressInputProps {
    value: string;
    onChange: (result: AddressResult) => void;
    placeholder?: string;
    className?: string;
}
export declare function AddressInput({ value, onChange, placeholder, className }: AddressInputProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AddressInput.d.ts.map