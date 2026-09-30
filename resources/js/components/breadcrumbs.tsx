import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronsUpDown, Search } from 'lucide-react';
import { Fragment, useState } from 'react';

function SiblingDropdown({ item }: { item: BreadcrumbItemType }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    if (!item.siblings || item.siblings.length <= 1) {
        return null;
    }

    const query = search.trim().toLowerCase();
    const filteredSiblings = query
        ? item.siblings.filter((sibling) =>
              sibling.title.toLowerCase().includes(query),
          )
        : item.siblings;

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);

        if (!isOpen) {
            setSearch('');
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Switch to sibling"
                >
                    <ChevronsUpDown className="h-3 w-3" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-1">
                <div className="relative mb-1">
                    <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search..."
                        aria-label="Search"
                        className="h-8 pl-7 text-sm"
                        autoFocus
                    />
                </div>
                <div className="max-h-60 overflow-y-auto">
                    {filteredSiblings.length === 0 && (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                            No matches found.
                        </p>
                    )}
                    {filteredSiblings.map((sibling) => (
                        <Link
                            key={sibling.href}
                            href={sibling.href}
                            onClick={() => handleOpenChange(false)}
                            className={`block rounded-sm px-2 py-1.5 text-sm transition-colors ${
                                sibling.href === item.href
                                    ? 'bg-accent font-medium text-accent-foreground'
                                    : 'hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                            {sibling.title}
                        </Link>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function Breadcrumbs({
    breadcrumbs,
}: {
    breadcrumbs: BreadcrumbItemType[];
}) {
    return (
        <>
            {breadcrumbs.length > 0 && (
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((item, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            return (
                                <Fragment key={index}>
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <span className="inline-flex items-center">
                                                <BreadcrumbPage>
                                                    {item.title}
                                                </BreadcrumbPage>
                                                <SiblingDropdown item={item} />
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center">
                                                <BreadcrumbLink asChild>
                                                    <Link href={item.href}>
                                                        {item.title}
                                                    </Link>
                                                </BreadcrumbLink>
                                                <SiblingDropdown item={item} />
                                            </span>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator />}
                                </Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
        </>
    );
}
