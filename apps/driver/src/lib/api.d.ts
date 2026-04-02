export declare const api: {
    auth: {
        login: (email: string, password: string) => Promise<{
            success: boolean;
            data: {
                accessToken: string;
                user: any;
            };
        }>;
    };
    driver: {
        getOrders: (branchId?: string) => Promise<{
            success: boolean;
            data: {
                available_pickup: any[];
                available_delivery: any[];
                my_orders: any[];
            };
        }>;
        postLocation: (lat: number, lng: number, branchId: string, orderId?: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        markDelivered: (orderId: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        selfAssign: (orderId: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        markPickedUp: (orderId: string) => Promise<{
            success: boolean;
            data: any;
        }>;
    };
};
//# sourceMappingURL=api.d.ts.map