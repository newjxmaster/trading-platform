import React, { createContext, useContext, useState } from 'react';
import { cn } from '@utils/helpers';

// ============================================
// Tabs Context
// ============================================

interface TabsContextType {
    activeTab: string;
    setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs provider');
    }
    return context;
};

// ============================================
// Tabs Component
// ============================================

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultValue: string;
    value?: string;
    onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
    defaultValue,
    value,
    onValueChange,
    children,
    className,
    ...props
}) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const activeTab = value ?? internalValue;

    const setActiveTab = (newValue: string) => {
        setInternalValue(newValue);
        onValueChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={cn('w-full', className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

Tabs.displayName = 'Tabs';

// ============================================
// TabsList Component
// ============================================

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> { }

export const TabsList: React.FC<TabsListProps> = ({
    children,
    className,
    ...props
}) => {
    return (
        <div
            role="tablist"
            className={cn(
                'inline-flex items-center gap-1 rounded-lg bg-secondary-100 p-1',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

TabsList.displayName = 'TabsList';

// ============================================
// TabsTrigger Component
// ============================================

export interface TabsTriggerProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
    value,
    children,
    className,
    ...props
}) => {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    return (
        <button
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => setActiveTab(value)}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5',
                'text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                isActive
                    ? 'bg-white text-secondary-900 shadow-sm'
                    : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50',
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

TabsTrigger.displayName = 'TabsTrigger';

// ============================================
// TabsContent Component
// ============================================

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
    value,
    children,
    className,
    ...props
}) => {
    const { activeTab } = useTabsContext();

    if (activeTab !== value) return null;

    return (
        <div
            role="tabpanel"
            className={cn('mt-3 animate-fade-in', className)}
            {...props}
        >
            {children}
        </div>
    );
};

TabsContent.displayName = 'TabsContent';

export default Tabs;
