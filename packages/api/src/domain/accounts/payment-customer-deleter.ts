export interface PaymentCustomerDeleter {
  deleteCustomer(customerId: string): Promise<void>;
}
