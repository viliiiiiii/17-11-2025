import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");

  const inventoryItems = [
    { id: 1, name: "Office Paper", category: "Supplies", quantity: 45, status: "In Stock" },
    { id: 2, name: "Printer Ink", category: "Supplies", quantity: 8, status: "Low Stock" },
    { id: 3, name: "Cleaning Supplies", category: "Maintenance", quantity: 23, status: "In Stock" },
    { id: 4, name: "Hand Sanitizer", category: "Health", quantity: 67, status: "In Stock" },
    { id: 5, name: "Light Bulbs", category: "Maintenance", quantity: 3, status: "Low Stock" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground mt-1">Manage your office supplies</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  <Badge 
                    variant={item.status === "Low Stock" ? "destructive" : "default"}
                    className={item.status === "In Stock" ? "bg-success text-white" : ""}
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
