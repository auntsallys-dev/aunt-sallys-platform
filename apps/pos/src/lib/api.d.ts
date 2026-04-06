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
            address?: string;
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
        edit: (id: string, data: {
            addItems?: {
                serviceId: string;
                quantity: number;
                notes?: string;
            }[];
            removeItemIds?: string[];
            extraCharges?: {
                name: string;
                price: number;
            }[];
            refund?: boolean;
        }) => Promise<{
            success: boolean;
            data: any;
        }>;
        updateStatus: (id: string, status: string, notes?: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        cancel: (id: string) => Promise<{
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
    analytics: {
        overview: (period: "today" | "week" | "month") => Promise<{
            success: boolean;
            data: any;
        }>;
    };
    admin: {
        customers: {
            list: (params: {
                page?: number;
                pageSize?: number;
                sort?: string;
                search?: string;
            }) => Promise<{
                success: boolean;
                data: any[];
                meta: any;
            }>;
            get: (customerId: string) => Promise<{
                success: boolean;
                data: any;
            }>;
            update: (customerId: string, data: Record<string, unknown>) => Promise<{
                success: boolean;
                data: any;
            }>;
            orderHistory: (customerId: string) => Promise<{
                success: boolean;
                data: any;
            }>;
        };
        drivers: {
            list: (branchId: string) => Promise<{
                success: boolean;
                data: any[];
            }>;
            locations: (branchId: string) => Promise<{
                success: boolean;
                data: any;
            }>;
        };
    };
    adminServices: {
        list: () => Promise<{
            success: boolean;
            data: any[];
        }>;
        create: (data: {
            name: string;
            category: string;
            basePrice: number;
            priceUnit: string;
            estimatedHours?: number;
            description?: string;
        }) => Promise<{
            success: boolean;
            data: any;
        }>;
        update: (id: string, data: Partial<{
            name: string;
            category: string;
            basePrice: number;
            priceUnit: string;
            estimatedHours: number;
            description: string;
            isActive: boolean;
        }>) => Promise<{
            success: boolean;
            data: any;
        }>;
        delete: (id: string) => Promise<{
            success: boolean;
            data: any;
        }>;
    };
    adminBranches: {
        list: () => Promise<{
            success: boolean;
            data: any[];
        }>;
        create: (data: {
            name: string;
            slug: string;
            address?: string;
            phone?: string;
            email?: string;
            lat?: number;
            lng?: number;
        }) => Promise<{
            success: boolean;
            data: any;
        }>;
        update: (id: string, data: Partial<{
            name: string;
            slug: string;
            address: string;
            phone: string;
            email: string;
            isActive: boolean;
            lat: number;
            lng: number;
        }>) => Promise<{
            success: boolean;
            data: any;
        }>;
        delete: (id: string) => Promise<{
            success: boolean;
            data: any;
        }>;
    };
    assignDriver: (orderId: string, driverId: string) => Promise<{
        success: boolean;
        data: any;
    }>;
    transferBranch: (orderId: string, branchId: string, notes?: string) => Promise<{
        success: boolean;
        data: any;
    }>;
    driver: {
        getOrders: (branchId?: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        postLocation: (lat: number, lng: number, branchId: string, orderId?: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        markDelivered: (orderId: string) => Promise<{
            success: boolean;
            data: any;
        }>;
        collectPayment: (orderId: string, paymentMethod: "cash" | "gcash" | "maya") => Promise<{
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