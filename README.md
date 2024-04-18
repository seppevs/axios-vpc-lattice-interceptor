# Axios VPC Lattice Interceptor

## Installation
```bash
npm install axios-vpc-lattice-interceptor --save
```

## Usage
```typescript
import axios from 'axios';
import vpcLatticeInterceptor from 'axios-vpc-lattice-interceptor';

axios.interceptors.request.use(vpcLatticeInterceptor);

```
