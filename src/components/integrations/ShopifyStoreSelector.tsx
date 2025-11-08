import { Check, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useShopifyStores } from "@/hooks/useShopifyStores";

export const ShopifyStoreSelector = () => {
  const { stores, activeStoreId, setActiveStore, loading } = useShopifyStores();
  const [open, setOpen] = useState(false);

  const activeStore = stores.find(s => s.id === activeStoreId);

  if (loading || stores.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px]"
        >
          <Store className="mr-2 h-4 w-4" />
          <span className="truncate">
            {activeStore?.customer_name || activeStore?.store_url || "Select store"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No stores found.</CommandEmpty>
            <CommandGroup heading="Connected Stores">
              {stores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.id}
                  onSelect={() => {
                    setActiveStore(store.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeStoreId === store.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">
                      {store.customer_name || store.store_url}
                    </span>
                    {store.customer_name && (
                      <span className="text-xs text-muted-foreground truncate">
                        {store.store_url}
                      </span>
                    )}
                  </div>
                  {!store.is_active && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
