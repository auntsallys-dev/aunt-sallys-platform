export declare const api: {
    auth: {
        login: (email: string, password: string) => Promise<{
            success: boolean;
            data: {
                accessToken: string;
                user: any;
            };
        }>;
        logout: (refreshToken?: string) => Promise<unknown>;
    };
    branches: {
        list: () => Promise<{
            success: boolean;
            data: any[];
        }>;
    };
    services: {
        list: (branchId?: string) => Promise<{
            success: boolean;
            data: any[];
        }>;
    };
    customers: {
        search: (query: string) => Promise<{
            success: boolean;
            data: any[];
        }>;
        create: (data: {
            firstName: string;
            lastName?: string;
            phone?: string;
            email?: string;
        }) => Promise<{
            success: boolean;
            data: any;
        }>;
    };
    orders: {
        list: (params?: {
            branchId?: string;
            status?: string;
            date?: string;
        }) => Promise<{
            success: boolean;
            data: any[];
        }>;
        get: (id: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        create: (data: any) => Promise<{
            success: boolean;
            data: any;
        }>;
        updateStatus: (id: string, status: string, notes?: string) => Promise<{
            success: boolean;
            data: any;
        }>;
    };
    payments: {
        create: (data: {
            orderId: string;
            amount: number;
            method: string;
            reference?: string;
        }) => Promise<{
            success: boolean;
            data: any;
        }>;
    };
};
//# sourceMappingURL=api.d.ts.map